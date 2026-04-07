import { supabase, type Dish, type Restaurant } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getDish(id: string): Promise<(Dish & { restaurant: Restaurant }) | null> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*, restaurant:restaurants(*)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Dish & { restaurant: Restaurant }
}

export default async function DishPage({ params }: { params: { id: string } }) {
  const dish = await getDish(params.id)
  if (!dish) notFound()

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* model-viewer — full viewport height on mobile */}
      <div className="flex-1 relative" style={{ minHeight: '65vh' }}>
        <model-viewer
          src={dish.glb_url}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            background: '#111',
          }}
          alt={dish.name}
        >
          <button
            slot="ar-button"
            style={{
              backgroundColor: '#ff6b35',
              borderRadius: '9999px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              padding: '14px 28px',
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 4px 20px rgba(255,107,53,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            View in AR
          </button>
        </model-viewer>
      </div>

      {/* Dish info panel */}
      <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
        {dish.restaurant && (
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
            {dish.restaurant.name}
          </p>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{dish.name}</h1>
          <span className="text-2xl font-bold text-orange-500 flex-shrink-0">
            ${Number(dish.price).toFixed(2)}
          </span>
        </div>
        {dish.description && (
          <p className="mt-3 text-gray-600 leading-relaxed">{dish.description}</p>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Rotate with one finger · Pinch to zoom · Tap &quot;View in AR&quot; to place on your table
        </div>
      </div>
    </div>
  )
}
