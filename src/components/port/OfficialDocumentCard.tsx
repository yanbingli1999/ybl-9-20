import { MapPin, Clock, Coins, Check, Stamp, Shield, AlertTriangle } from 'lucide-react';
import type { OfficialDocument } from '../../../shared/types';
import { useGameStore } from '../../store/useGameStore';

interface OfficialDocumentCardProps {
  document: OfficialDocument;
  showAccept?: boolean;
  showSelect?: boolean;
  isSelected?: boolean;
}

const OfficialDocumentCard = ({
  document,
  showAccept = true,
  showSelect = false,
  isSelected = false,
}: OfficialDocumentCardProps) => {
  const {
    acceptOfficialDocument,
    selectOfficialDocument,
    stampCheckpoints,
    cities,
    player,
  } = useGameStore();

  const destination = cities.find(c => c.id === document.destinationId);
  const requiredStampDetails = document.requiredStamps.map(id =>
    stampCheckpoints.find(s => s.id === id)
  ).filter(Boolean);

  const handleAccept = () => {
    acceptOfficialDocument(document.id);
  };

  const handleSelect = () => {
    selectOfficialDocument(document.id);
  };

  const getGradeConfig = (grade: 'ordinary' | 'urgent' | 'imperial') => {
    switch (grade) {
      case 'imperial':
        return {
          label: '御件',
          color: 'text-yellow-600 bg-yellow-500/10 border-yellow-300',
          badge: 'bg-gradient-to-r from-yellow-500 to-amber-600',
          icon: '🏯',
        };
      case 'urgent':
        return {
          label: '急件',
          color: 'text-red-600 bg-red-500/10 border-red-300',
          badge: 'bg-gradient-to-r from-red-500 to-rose-600',
          icon: '⚡',
        };
      default:
        return {
          label: '常件',
          color: 'text-blue-600 bg-blue-500/10 border-blue-300',
          badge: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          icon: '📜',
        };
    }
  };

  const gradeConfig = getGradeConfig(document.grade);

  return (
    <div
      className={`relative bg-white rounded-xl shadow-md border-2 transition-all hover:shadow-lg ${
        isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-slate-200'
      } ${document.isAccepted ? 'opacity-60' : ''}`}
    >
      <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-white text-xs font-bold rounded-full ${gradeConfig.badge}`}>
        {gradeConfig.label}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{gradeConfig.icon}</span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{document.title}</h3>
              <p className="text-xs text-slate-500">{gradeConfig.label}公文</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>目的地: </span>
            <span className="font-medium text-slate-800">
              {destination?.name || document.destinationName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>期限: </span>
            <span className={`font-medium ${
              document.deadlineHours < 12 ? 'text-red-500' : 'text-slate-800'
            }`}>
              {document.deadlineHours} 小时
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Stamp className="w-4 h-4 text-slate-400" />
              <span>必经盖印 ({requiredStampDetails.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 ml-6">
              {requiredStampDetails.map(stamp =>
                stamp ? (
                  <span
                    key={stamp.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      stamp.type === 'gate'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {stamp.type === 'gate' ? '🚪' : '🐎'} {stamp.name}
                  </span>
                ) : null
              )}
            </div>
          </div>

          {document.grade !== 'ordinary' && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              不可与饮品、奢侈品、食品混装
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="text-xl font-bold text-amber-600">
              {document.reward.toLocaleString()}
            </span>
          </div>

          {showAccept && !document.isAccepted && !document.isCompleted && (
            <button
              onClick={handleAccept}
              className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-400 hover:to-purple-500 transition-all"
            >
              <Shield className="w-4 h-4" />
              承接公文
            </button>
          )}

          {showSelect && document.isAccepted && !document.isCompleted && (
            <button
              onClick={handleSelect}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isSelected
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isSelected ? <Check className="w-4 h-4" /> : null}
              {isSelected ? '已选择' : '选择'}
            </button>
          )}

          {document.isCompleted && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg">
              已完成
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficialDocumentCard;
