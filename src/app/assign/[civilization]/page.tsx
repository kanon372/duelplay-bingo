// 旧形式のQR（/assign/[文明]）。イベントコードが無く、別イベントのQRと区別できないため受け付けない。
export default function LegacyAssignPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="text-xl font-bold mb-2">このQRは使用できません</h1>
        <p className="text-gray-400 text-sm">このQRコードは別のイベント用です。<br />スタッフにお声がけください。</p>
      </div>
    </div>
  )
}
