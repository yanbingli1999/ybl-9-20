import { RefreshCw, Package, Shield, Stamp } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import CommissionCard from './CommissionCard';
import OfficialDocumentCard from './OfficialDocumentCard';

const PortHall = () => {
  const { commissions, officialDocuments, generateDailyCommissions, generateDailyOfficialDocuments, warehouse, goodsList, player, stampCheckpoints } = useGameStore();
  
  const availableCommissions = commissions.filter(c => !c.isAccepted && !c.isCompleted);
  const acceptedCommissions = commissions.filter(c => c.isAccepted && !c.isCompleted);
  const completedCommissions = commissions.filter(c => c.isCompleted);

  const availableDocuments = officialDocuments.filter(d => !d.isAccepted && !d.isCompleted);
  const acceptedDocuments = officialDocuments.filter(d => d.isAccepted && !d.isCompleted);
  
  const usedSpace = warehouse.usedSpace;
  const totalCapacity = warehouse.capacity;
  const usagePercent = (usedSpace / totalCapacity) * 100;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">港口大厅</h2>
            <p className="text-slate-500">浏览今日的委托与公文，选择合适的订单承接</p>
          </div>
          
          <button
            onClick={() => { generateDailyCommissions(); generateDailyOfficialDocuments(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新全部
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {availableDocuments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  官府公文 ({availableDocuments.length})
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    {player.officialRank} · 官府声望 {player.officialReputation}
                  </span>
                </h3>
                
                {player.timeOfDay === 'evening' || player.timeOfDay === 'night' ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                    <p className="text-indigo-700">
                      天色已晚，公文承接已截止。请明天再来！
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableDocuments.map(doc => (
                      <OfficialDocumentCard
                        key={doc.id}
                        document={doc}
                        showAccept={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                今日委托 ({availableCommissions.length})
              </h3>
              
              {player.timeOfDay === 'evening' || player.timeOfDay === 'night' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-amber-700">
                    天色已晚，今日委托已截止。请明天再来！
                  </p>
                </div>
              ) : availableCommissions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-500">暂无可用委托，请点击刷新按钮</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableCommissions.map(commission => (
                    <CommissionCard
                      key={commission.id}
                      commission={commission}
                      showAccept={true}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {(acceptedCommissions.length > 0 || acceptedDocuments.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-500" />
                  已承接 ({acceptedCommissions.length + acceptedDocuments.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedDocuments.map(doc => (
                    <OfficialDocumentCard
                      key={doc.id}
                      document={doc}
                      showAccept={false}
                    />
                  ))}
                  {acceptedCommissions.map(commission => (
                    <CommissionCard
                      key={commission.id}
                      commission={commission}
                      showAccept={false}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {completedCommissions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-400" />
                  已完成 ({completedCommissions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedCommissions.slice(-4).map(commission => (
                    <CommissionCard
                      key={commission.id}
                      commission={commission}
                      showAccept={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-slate-800 mb-4">仓库状态</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">已用容量</span>
                  <span className="font-medium text-slate-800">
                    {usedSpace} / {totalCapacity}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  剩余空间: {totalCapacity - usedSpace}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
              <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                官府信使
              </h3>
              <div className="space-y-2 text-sm text-indigo-700">
                <div className="flex justify-between">
                  <span>信使品级</span>
                  <span className="font-medium">{player.officialRank}</span>
                </div>
                <div className="flex justify-between">
                  <span>官府声望</span>
                  <span className="font-medium">{player.officialReputation}</span>
                </div>
                <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (player.officialReputation / 500) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-indigo-500 mt-2 space-y-1">
                  <p>• 铜牌信使 (100): 解锁急件公文</p>
                  <p>• 银牌信使 (300): 解锁御件公文</p>
                  <p>• 金牌信使 (500): 最高品级</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
              <h3 className="font-semibold text-amber-800 mb-3">经营提示</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  信誉等级越高，可获得更高的临时加价
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  易碎货物需要小心运输，货损会影响信誉
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  紧急订单报酬更高，但期限更短
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  选择合适的天气和路线可以减少货损
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  公文需经指定城门或驿站盖印，缺印扣奖励
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  公文不可与饮品、奢侈品、食品类货物混装
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Stamp className="w-4 h-4" />
                盖印站一览
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stampCheckpoints.map(stamp => (
                  <div key={stamp.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{stamp.type === 'gate' ? '🚪' : '🐎'}</span>
                      <span className="text-slate-700">{stamp.name}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      stamp.type === 'gate' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {stamp.type === 'gate' ? '城门' : '驿站'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-slate-800 mb-4">货物说明</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {goodsList.slice(0, 6).map(goods => (
                  <div key={goods.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{goods.icon}</span>
                      <span className="text-slate-700">{goods.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>重量: {goods.weight}</span>
                      <span>易碎: {goods.fragility}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortHall;
