/** ゲームで出たカードの新しい順の一覧（会場の大画面を見ていなくても、出たカードがわかる） */
export default function RecentDraws({ order, stale }: { order: string[]; stale: boolean }) {
  const recent = order.slice(-12).reverse()
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-xs font-bold">出たカード {order.length}枚</span>
        {stale && <span className="text-orange-400 text-xs">通信が不安定です</span>}
      </div>
      {recent.length === 0 ? (
        <p className="text-gray-500 text-xs">まだ出ていません</p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {recent.map((no, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={no}
              src={`/cards/${no}.webp`}
              alt={no}
              width={44}
              height={62}
              className={`rounded-sm shrink-0 ${i === 0 ? 'ring-2 ring-yellow-400' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
