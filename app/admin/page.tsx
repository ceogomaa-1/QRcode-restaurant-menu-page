'use client'

import { useState, useEffect } from 'react'
import { supabase, type Dish, type Restaurant } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import Link from 'next/link'

// Convert OBJ text → GLB ArrayBuffer using Three.js (browser-side)
async function objToGlb(objText: string): Promise<ArrayBuffer> {
  const THREE = await import('three')
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

  const object = new OBJLoader().parse(objText)

  // Center and normalise scale so the model looks reasonable in AR
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) object.scale.setScalar(1 / maxDim)
  box.setFromObject(object)
  box.getCenter(center)
  object.position.sub(center)

  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      object,
      (result) => resolve(result instanceof ArrayBuffer ? result : new TextEncoder().encode(JSON.stringify(result)).buffer as ArrayBuffer),
      reject,
      { binary: true }
    )
  })
}

// Convert GLB ArrayBuffer → USDZ ArrayBuffer using Three.js (browser-side)
async function glbToUsdz(glbBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js')

  const gltf = await new Promise<{ scene: import('three').Group }>((resolve, reject) => {
    new GLTFLoader().parse(glbBuffer, '', resolve as (g: unknown) => void, reject)
  })

  return await new USDZExporter().parseAsync(gltf.scene)
}

export default function AdminPage() {
  const [dishes, setDishes] = useState<(Dish & { restaurant?: Restaurant })[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [appUrl, setAppUrl] = useState('')

  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    restaurantId: '',
    newRestaurantName: '',
    newRestaurantSlug: '',
  })
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [useNewRestaurant, setUseNewRestaurant] = useState(false)

  useEffect(() => {
    setAppUrl(window.location.origin)
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: dishData }, { data: restData }] = await Promise.all([
      supabase.from('dishes').select('*, restaurant:restaurants(*)').order('created_at', { ascending: false }),
      supabase.from('restaurants').select('*').order('name'),
    ])
    if (dishData) setDishes(dishData as (Dish & { restaurant?: Restaurant })[])
    if (restData) setRestaurants(restData)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitStatus(null)

    if (!modelFile) {
      setSubmitStatus({ type: 'error', message: 'Please select a .glb or .obj file' })
      return
    }
    const ext = modelFile.name.split('.').pop()?.toLowerCase()
    if (!['glb', 'obj'].includes(ext ?? '')) {
      setSubmitStatus({ type: 'error', message: 'File must be .glb or .obj' })
      return
    }

    setSubmitting(true)
    try {
      let restaurantId = form.restaurantId
      if (useNewRestaurant) {
        if (!form.newRestaurantName || !form.newRestaurantSlug) {
          setSubmitStatus({ type: 'error', message: 'Please enter restaurant name and slug' })
          setSubmitting(false)
          return
        }
        const { data: newRest, error: restError } = await supabase
          .from('restaurants')
          .insert({ name: form.newRestaurantName, slug: form.newRestaurantSlug })
          .select()
          .single()
        if (restError) throw new Error(restError.message)
        restaurantId = newRest.id
      }
      if (!restaurantId) {
        setSubmitStatus({ type: 'error', message: 'Please select or create a restaurant' })
        setSubmitting(false)
        return
      }

      // --- Resolve GLB buffer ---
      let glbBuffer: ArrayBuffer
      if (ext === 'obj') {
        setSubmitStatus({ type: 'success', message: 'Converting OBJ → GLB…' })
        glbBuffer = await objToGlb(await modelFile.text())
      } else {
        glbBuffer = await modelFile.arrayBuffer()
      }

      // --- Generate USDZ for iOS ---
      setSubmitStatus({ type: 'success', message: 'Generating USDZ for iOS…' })
      let usdzBuffer: ArrayBuffer | null = null
      try {
        usdzBuffer = await glbToUsdz(glbBuffer)
      } catch {
        // USDZ generation is best-effort; don't fail the whole upload
        console.warn('USDZ generation failed, continuing without iOS AR support')
      }

      // --- Upload GLB ---
      const base = `${Date.now()}-${modelFile.name.replace(/\s+/g, '-').replace(/\.obj$/i, '.glb')}`
      setSubmitStatus({ type: 'success', message: 'Uploading 3D model…' })
      const { error: uploadError } = await supabase.storage
        .from('glb-models')
        .upload(base, new Blob([glbBuffer], { type: 'model/gltf-binary' }), { contentType: 'model/gltf-binary' })
      if (uploadError) throw new Error(uploadError.message)
      const { data: glbUrlData } = supabase.storage.from('glb-models').getPublicUrl(base)

      // --- Upload USDZ ---
      let usdzPublicUrl: string | null = null
      if (usdzBuffer) {
        const usdzName = base.replace(/\.glb$/i, '.usdz')
        const { error: usdzError } = await supabase.storage
          .from('glb-models')
          .upload(usdzName, new Blob([usdzBuffer], { type: 'model/vnd.usdz+zip' }), { contentType: 'model/vnd.usdz+zip' })
        if (!usdzError) {
          const { data: usdzUrlData } = supabase.storage.from('glb-models').getPublicUrl(usdzName)
          usdzPublicUrl = usdzUrlData.publicUrl
        }
      }

      // --- Save dish ---
      const { error: dishError } = await supabase.from('dishes').insert({
        restaurant_id: restaurantId,
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
        glb_url: glbUrlData.publicUrl,
        usdz_url: usdzPublicUrl,
      })
      if (dishError) throw new Error(dishError.message)

      setSubmitStatus({ type: 'success', message: 'Dish uploaded successfully!' })
      setForm({ name: '', price: '', description: '', restaurantId: '', newRestaurantName: '', newRestaurantSlug: '' })
      setModelFile(null)
      setUseNewRestaurant(false)
      await fetchData()
    } catch (err: unknown) {
      setSubmitStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setSubmitting(false)
    }
  }

  function downloadQR(dishId: string, dishName: string) {
    const canvas = document.getElementById(`qr-${dishId}`) as HTMLCanvasElement
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `qr-${dishName.toLowerCase().replace(/\s+/g, '-')}.png`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Home</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Add New Dish</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Restaurant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant</label>
                  {!useNewRestaurant ? (
                    <div className="space-y-2">
                      <select
                        value={form.restaurantId}
                        onChange={e => setForm(f => ({ ...f, restaurantId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        <option value="">Select restaurant...</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setUseNewRestaurant(true)} className="text-sm text-orange-500 hover:underline">
                        + Create new restaurant
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Restaurant name"
                        value={form.newRestaurantName}
                        onChange={e => setForm(f => ({ ...f, newRestaurantName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <input
                        type="text"
                        placeholder="URL slug (e.g. my-restaurant)"
                        value={form.newRestaurantSlug}
                        onChange={e => setForm(f => ({
                          ...f,
                          newRestaurantSlug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <button type="button" onClick={() => setUseNewRestaurant(false)} className="text-sm text-gray-500 hover:underline">
                        ← Use existing
                      </button>
                    </div>
                  )}
                </div>

                {/* Dish name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Margherita Pizza"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="12.99"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the dish..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                {/* 3D Model file */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    3D Model <span className="text-gray-400 font-normal">(.glb or .obj)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept=".glb,.obj"
                      onChange={e => setModelFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="model-upload"
                    />
                    <label htmlFor="model-upload" className="cursor-pointer">
                      {modelFile ? (
                        <span className="text-sm text-orange-600 font-medium">{modelFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-500">Click to upload .glb or .obj</span>
                      )}
                    </label>
                  </div>
                  {modelFile?.name.endsWith('.obj') && (
                    <p className="text-xs text-blue-500 mt-1">OBJ will be auto-converted to GLB + USDZ for iOS AR</p>
                  )}
                  {modelFile?.name.endsWith('.glb') && (
                    <p className="text-xs text-blue-500 mt-1">GLB will be auto-converted to USDZ for iOS AR</p>
                  )}
                </div>

                {submitStatus && (
                  <div className={`text-sm rounded-lg px-3 py-2 ${submitStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {submitStatus.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  {submitting ? (submitStatus?.message ?? 'Processing…') : 'Upload Dish'}
                </button>
              </form>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Dishes {dishes.length > 0 && <span className="text-gray-400 font-normal text-base">({dishes.length})</span>}
            </h2>

            {loading ? (
              <div className="text-gray-500 text-sm">Loading dishes...</div>
            ) : dishes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-400">No dishes yet. Upload your first dish!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dishes.map(dish => (
                  <div key={dish.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <QRCodeCanvas
                          id={`qr-${dish.id}`}
                          value={appUrl ? `${appUrl}/dish/${dish.id}` : `https://q-rcode-restaurant-menu-page.vercel.app/dish/${dish.id}`}
                          size={90}
                          level="M"
                          includeMargin={true}
                        />
                        <button onClick={() => downloadQR(dish.id, dish.name)} className="text-xs text-orange-500 hover:underline">
                          Download PNG
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{dish.name}</h3>
                        <p className="text-orange-600 font-medium text-sm">${Number(dish.price).toFixed(2)}</p>
                        {dish.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{dish.description}</p>
                        )}
                        {dish.restaurant && (
                          <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {dish.restaurant.name}
                          </span>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <Link href={`/dish/${dish.id}`} target="_blank" className="text-xs text-blue-500 hover:underline">
                            View AR →
                          </Link>
                          {dish.usdz_url && (
                            <span className="text-xs text-green-600 font-medium">iOS ready</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
