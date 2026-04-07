import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          AR Menu Generator
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Create immersive augmented reality menus for your restaurant. Let customers view dishes in 3D before they order.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <Link
            href="/admin"
            className="block p-8 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-orange-100"
          >
            <div className="text-4xl mb-3">🍽️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Panel</h2>
            <p className="text-gray-500 text-sm">Upload dishes, manage your 3D models, and generate QR codes for your menu.</p>
          </Link>

          <div className="block p-8 bg-white rounded-2xl shadow-md border border-orange-100">
            <div className="text-4xl mb-3">📱</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Menu Page</h2>
            <p className="text-gray-500 text-sm">
              Visit <code className="bg-gray-100 px-1 rounded">/menu/[slug]</code> to view a restaurant&apos;s full AR menu.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-orange-100 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Start</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span className="font-bold text-orange-500">1.</span> Set up your Supabase project and add credentials to <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
            <li className="flex gap-2"><span className="font-bold text-orange-500">2.</span> Run the SQL schema to create the <code className="bg-gray-100 px-1 rounded">restaurants</code> and <code className="bg-gray-100 px-1 rounded">dishes</code> tables</li>
            <li className="flex gap-2"><span className="font-bold text-orange-500">3.</span> Go to <Link href="/admin" className="text-orange-500 underline">/admin</Link> to upload your first dish with a .glb model</li>
            <li className="flex gap-2"><span className="font-bold text-orange-500">4.</span> Share the generated QR code — customers scan it to view in AR!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
