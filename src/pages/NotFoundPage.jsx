import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-gray-500">Hindi mahanap ang page.</p>
      <Link to="/" className="text-blue-600 underline">Bumalik sa Dashboard</Link>
    </div>
  )
}