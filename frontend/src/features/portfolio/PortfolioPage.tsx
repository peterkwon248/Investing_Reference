import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, TrendingUp, TrendingDown, ChevronRight, Trash2, X } from 'lucide-react';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio, usePortfolioDetail } from '@/hooks/usePortfolio';
import { formatKRW, formatUSD, formatPercent, getProfitColor } from '@/lib/utils';
import type { PortfolioSummary } from '@/types/portfolio.types';

function CreatePortfolioModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const createMutation = useCreatePortfolio();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createMutation.mutateAsync({ name: name.trim(), description, currency });
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4"
      >
        <div className="toss-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title-2 text-foreground">새 포트폴리오</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-body-2 font-medium text-muted-foreground mb-2">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="내 포트폴리오"
                className="toss-input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-body-2 font-medium text-muted-foreground mb-2">설명</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="포트폴리오 설명 (선택)"
                className="toss-input w-full"
              />
            </div>
            <div>
              <label className="block text-body-2 font-medium text-muted-foreground mb-2">통화</label>
              <div className="flex gap-2">
                {['USD', 'KRW'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`flex-1 py-2.5 rounded-xl text-body-2 font-medium transition-all ${
                      currency === c
                        ? 'bg-primary text-primary-foreground shadow-toss-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {c === 'USD' ? '$ USD' : '\u20a9 KRW'}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="toss-btn-primary w-full py-3 mt-2"
            >
              {createMutation.isPending ? '생성 중...' : '포트폴리오 만들기'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function PortfolioCard({ portfolio, onSelect, onDelete }: {
  portfolio: PortfolioSummary;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const profitColor = getProfitColor(portfolio.total_profit_loss);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="toss-card p-5 cursor-pointer group hover:shadow-toss-lg transition-all duration-300"
      onClick={() => onSelect(portfolio.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Briefcase size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-body-1 font-semibold text-foreground">{portfolio.name}</h3>
            <p className="text-caption text-muted-foreground">{portfolio.position_count}개 종목</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(portfolio.id); }}
            className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-loss/10 text-muted-foreground hover:text-loss transition-all"
          >
            <Trash2 size={16} />
          </button>
          <ChevronRight size={20} className="text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-body-2 text-muted-foreground">총 자산</span>
          <span className="text-title-3 font-bold text-foreground">
            {portfolio.currency === 'KRW' ? formatKRW(portfolio.total_value) : formatUSD(portfolio.total_value)}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-body-2 text-muted-foreground">수익률</span>
          <div className="flex items-center gap-2">
            {portfolio.total_profit_loss !== 0 && (
              portfolio.total_profit_loss > 0
                ? <TrendingUp size={14} className={profitColor} />
                : <TrendingDown size={14} className={profitColor} />
            )}
            <span className={`text-body-1 font-semibold ${profitColor}`}>
              {formatPercent(portfolio.total_profit_loss_percent)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PortfolioDetailPanel({ portfolioId, onClose }: { portfolioId: number; onClose: () => void }) {
  const { data: portfolio, isLoading } = usePortfolioDetail(portfolioId);

  if (isLoading || !portfolio) {
    return (
      <div className="toss-card p-6 animate-pulse">
        <div className="h-6 bg-secondary rounded w-1/3 mb-4" />
        <div className="h-10 bg-secondary rounded w-2/3 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const profitColor = getProfitColor(portfolio.total_profit_loss);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="toss-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-2 font-bold text-foreground">{portfolio.name}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        {portfolio.description && (
          <p className="text-body-2 text-muted-foreground mb-4">{portfolio.description}</p>
        )}
        <div className="text-display font-bold text-foreground mb-1">
          {portfolio.currency === 'KRW' ? formatKRW(portfolio.total_value) : formatUSD(portfolio.total_value)}
        </div>
        <div className={`flex items-center gap-2 ${profitColor}`}>
          {portfolio.total_profit_loss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span className="text-body-1 font-semibold">
            {portfolio.total_profit_loss >= 0 ? '+' : ''}
            {portfolio.currency === 'KRW'
              ? formatKRW(portfolio.total_profit_loss)
              : formatUSD(portfolio.total_profit_loss)
            }
          </span>
          <span className="text-body-2">({formatPercent(portfolio.total_profit_loss_percent)})</span>
        </div>
      </div>

      {/* Positions */}
      <div className="toss-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-3 font-semibold text-foreground">보유 종목 ({portfolio.positions.length})</h3>
        </div>
        {portfolio.positions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-body-2 text-muted-foreground">보유 중인 종목이 없습니다</p>
            <p className="text-caption text-muted-foreground mt-1">종목을 추가해서 포트폴리오를 구성하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolio.positions.map((pos) => {
              const posProfitColor = getProfitColor(pos.profit_loss || 0);
              return (
                <div key={pos.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                  <div>
                    <div className="text-body-2 font-medium text-foreground">{pos.ticker}</div>
                    <div className="text-caption text-muted-foreground">{pos.name} | {pos.shares}주</div>
                  </div>
                  <div className="text-right">
                    <div className="text-body-2 font-semibold text-foreground">
                      {pos.current_price ? formatUSD(pos.current_value || 0) : '-'}
                    </div>
                    {pos.profit_loss_percent !== null && pos.profit_loss_percent !== undefined && (
                      <div className={`text-caption font-medium ${posProfitColor}`}>
                        {formatPercent(pos.profit_loss_percent)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: portfolios = [], isLoading } = usePortfolios();
  const deleteMutation = useDeletePortfolio();

  const handleDelete = async (id: number) => {
    if (window.confirm('정말 이 포트폴리오를 삭제하시겠습니까?')) {
      await deleteMutation.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-foreground">포트폴리오</h1>
          <p className="text-body-2 text-muted-foreground mt-1">실전 투자 포트폴리오를 관리하세요</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="toss-btn-primary flex items-center gap-2 px-4 py-2.5"
        >
          <Plus size={18} />
          <span>새 포트폴리오</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="toss-card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-secondary" />
                <div>
                  <div className="h-4 bg-secondary rounded w-24 mb-1" />
                  <div className="h-3 bg-secondary rounded w-16" />
                </div>
              </div>
              <div className="h-5 bg-secondary rounded w-32 mb-2" />
              <div className="h-4 bg-secondary rounded w-20" />
            </div>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="toss-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={32} className="text-primary" />
          </div>
          <h3 className="text-title-3 font-semibold text-foreground mb-2">포트폴리오가 없습니다</h3>
          <p className="text-body-2 text-muted-foreground mb-6 max-w-sm mx-auto">
            첫 번째 포트폴리오를 만들어 실시간 투자 현황을 추적하세요
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="toss-btn-primary px-6 py-2.5"
          >
            포트폴리오 만들기
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio List */}
          <div className={`${selectedId ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
            <div className={`grid ${selectedId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
              {portfolios.map((p) => (
                <PortfolioCard
                  key={p.id}
                  portfolio={p}
                  onSelect={setSelectedId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedId && (
            <div className="lg:col-span-2">
              <PortfolioDetailPanel
                portfolioId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreatePortfolioModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
