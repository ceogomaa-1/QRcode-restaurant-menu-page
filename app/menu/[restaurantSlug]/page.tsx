import { supabase, type Dish, type Restaurant } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getRestaurantWithDishes(slug: string): Promise<{ restaurant: Restaurant; dishes: Dish[] } | null> {
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()
  if (restError || !restaurant) return null

  const { data: dishes, error: dishError } = await supabase
    .from('dishes')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
  if (dishError) return null

  return { restaurant, dishes: dishes || [] }
}

export default async function MenuPage({ params }: { params: { restaurantSlug: string } }) {
  const data = await getRestaurantWithDishes(params.restaurantSlug)
  if (!data) notFound()

  const { restaurant, dishes } = data
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scan any dish QR code to view in AR</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {dishes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No dishes available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dishes.map(dish => (
              <Link
                key={dish.id}
                href={`/dish/${dish.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* QR Code */}
                <div className="bg-gray-50 flex items-center justify-center py-6 border-b border-gray-100">
                  <QRCodeSVG
                    value={`${appUrl}/dish/${dish.id}`}
                    size={130}
                    level="M"
                    includeMargin={true}
                  />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900 text-base">{dish.name}</h2>
                  <p className="text-orange-500 font-bold text-lg mt-0.5">${Number(dish.price).toFixed(2)}</p>
                  {dish.description && (
                    <p className="text-gray-500 text-sm mt-1.5 line-clamp-2">{dish.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View in AR
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by AR Menu Generator
      </footer>
    </div>
  )
}
