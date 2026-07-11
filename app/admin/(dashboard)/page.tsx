export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-slate-500 mb-2">Total Webinars</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-slate-500 mb-2">Total Registrations</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-slate-500 mb-2">Revenue</div>
          <div className="text-3xl font-bold">$0</div>
        </div>
      </div>
    </div>
  )
}
