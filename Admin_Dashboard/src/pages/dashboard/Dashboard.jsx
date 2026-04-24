export default function Dashboard() {
  return (
    <div className="w-screen min-h-screen bg-gray-100">
  
      <header className="bg-white shadow px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Leftover Link - Admin Dashboard</h1>
      </header>


      <main className="p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Donations</h2>

        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Donor</th>
                <th className="px-6 py-3">Food Item</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Expiry</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-6 py-4">John's Bakery</td>
                <td className="px-6 py-4">Bread Loaves</td>
                <td className="px-6 py-4">15</td>
                <td className="px-6 py-4">Downtown</td>
                <td className="px-6 py-4">2 hrs</td>
                <td className="px-6 py-4 text-green-600 font-medium">Pending</td>
              </tr>
              <tr className="border-t">
                <td className="px-6 py-4">Food Court</td>
                <td className="px-6 py-4">Rice Packs</td>
                <td className="px-6 py-4">25</td>
                <td className="px-6 py-4">Sector 9</td>
                <td className="px-6 py-4">3 hrs</td>
                <td className="px-6 py-4 text-blue-600 font-medium">Accepted</td>
              </tr>
              <tr className="border-t">
                <td className="px-6 py-4">Events Ltd</td>
                <td className="px-6 py-4">Samosas</td>
                <td className="px-6 py-4">40</td>
                <td className="px-6 py-4">Venue Hall</td>
                <td className="px-6 py-4">1 hr</td>
                <td className="px-6 py-4 text-red-600 font-medium">Expired</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
