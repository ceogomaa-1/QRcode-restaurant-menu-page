export default function DishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
        async
      />
      {children}
    </>
  )
}
