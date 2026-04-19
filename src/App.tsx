import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CompPicker } from '@/components/CompPicker';
import { DataManagerModal } from '@/components/DataManagerModal';
import { ExportButton } from '@/components/ExportButton';
import { OrderInput } from '@/components/OrderInput';
import { PromptCard } from '@/components/PromptCard';
import { SettingsModal } from '@/components/SettingsModal';
import { loadTierConstraints } from '@/lib/dataLoader';
import { useDataStore } from '@/store/useDataStore';
import { assemblePrompt } from '@/lib/promptAssembler';
import { getRecommendedCompCodes } from '@/lib/compRecommendation';
import { optimizePrompt, optimizeSingleLanguage } from '@/lib/aiOptimize';
import { isConfigured, loadSettings } from '@/lib/settingsStorage';
import { countWords } from '@/lib/tokenCount';
import { useOrderStore } from '@/store/useOrderStore';
import type { AssembledPrompt, AppSettings } from '@/types';

export default function App() {
  const orders = useOrderStore((state) => state.orders);
  const compSelections = useOrderStore((state) => state.compSelections);
  const assembledPrompts = useOrderStore((state) => state.assembledPrompts);
  const addOrder = useOrderStore((state) => state.addOrder);
  const updateOrder = useOrderStore((state) => state.updateOrder);
  const removeOrder = useOrderStore((state) => state.removeOrder);
  const setCompSelection = useOrderStore((state) => state.setCompSelection);
  const setAssembledPrompts = useOrderStore((state) => state.setAssembledPrompts);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const setOptimizing = useOrderStore((state) => state.setOptimizing);
  const setOptimizingLanguage = useOrderStore((state) => state.setOptimizingLanguage);
  const setOptimizedResult = useOrderStore((state) => state.setOptimizedResult);
  const setOptimizedField = useOrderStore((state) => state.setOptimizedField);
  const setOptimizeError = useOrderStore((state) => state.setOptimizeError);

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);

  async function handleOptimize(orderId: string, compCode: string, prompt: string) {
    setOptimizing(orderId, compCode, true);
    try {
      const result = await optimizePrompt({
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        originalPrompt: prompt,
      });
      setOptimizedResult(orderId, compCode, result);
    } catch (err) {
      setOptimizeError(orderId, compCode, err instanceof Error ? err.message : String(err));
    } finally {
      setOptimizing(orderId, compCode, false);
    }
  }

  async function handleRefreshLanguage(
    orderId: string,
    compCode: string,
    prompt: string,
    language: 'en' | 'zh',
  ) {
    setOptimizing(orderId, compCode, true);
    setOptimizingLanguage(orderId, compCode, language);
    try {
      const text = await optimizeSingleLanguage({
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        originalPrompt: prompt,
        language,
      });
      setOptimizedField(orderId, compCode, language, text);
    } catch (err) {
      setOptimizeError(orderId, compCode, err instanceof Error ? err.message : String(err));
    } finally {
      setOptimizing(orderId, compCode, false);
      setOptimizingLanguage(orderId, compCode, null);
    }
  }

  const outfits = useDataStore((s) => s.outfits);
  const scenes = useDataStore((s) => s.scenes);
  const poses = useDataStore((s) => s.poses);
  const expressions = useDataStore((s) => s.expressions);
  const compositions = useDataStore((s) => s.compositions);
  const charactersById = useDataStore((s) => s.charactersById);
  const activeCharacterId = useDataStore((s) => s.activeCharacterId);
  const character = activeCharacterId ? charactersById[activeCharacterId] : undefined;
  const tierConstraints = loadTierConstraints();

  const canAddOrder =
    outfits.length > 0 &&
    scenes.length > 0 &&
    poses.length > 0 &&
    expressions.length > 0;
  const hasIncompleteData =
    outfits.length === 0 ||
    scenes.length === 0 ||
    poses.length === 0 ||
    expressions.length === 0 ||
    compositions.length === 0;

  function handleAddBlankOrder() {
    if (!canAddOrder) return;
    addOrder({
      outfit: outfits[0].code,
      scene: scenes[0].code,
      pose: poses[0].code,
      expr: expressions[0].code,
      tier: 'T0',
      count: 1,
    });
  }

  function handleRecommend() {
    if (compositions.length === 0) return;
    setGlobalError(null);
    setAssembledPrompts([]);

    for (const order of orders) {
      setCompSelection(order.id, {
        recommendedCompCodes: compositions.map((composition) => composition.code),
        selectedCompCodes: [],
      });
    }
  }

  function handleAssemble() {
    if (!character) return;
    setGlobalError(null);

    const prompts: AssembledPrompt[] = [];

    for (const order of orders) {
      const selection = compSelections[order.id];
      if (!selection) {
        continue;
      }

      for (const compCode of selection.selectedCompCodes) {
        const composition = compositions.find((item) => item.code === compCode);
        const outfit = outfits.find((item) => item.code === order.outfit);
        const scene = scenes.find((item) => item.code === order.scene);
        const pose = poses.find((item) => item.code === order.pose);
        const expression = expressions.find((item) => item.code === order.expr);

        if (!composition || !outfit || !scene || !pose || !expression) {
          continue;
        }

        const prompt = assemblePrompt({
          order,
          comp: composition,
          character,
          outfit,
          scene,
          pose,
          expression,
          tierConstraints,
        });

        prompts.push({
          orderId: order.id,
          compCode,
          prompt,
          estimatedWords: countWords(prompt),
        });
      }
    }

    setAssembledPrompts(prompts);
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-5xl space-y-6">
          <AppHeader
            onOpenDataManager={() => setDataManagerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
            尚未匯入角色資料。請點右上方「資料管理」匯入 Characters 與 5 個 styles 資料集。
          </section>
          <SettingsModal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onSaved={(next) => setSettings(next)}
          />
          <DataManagerModal
            open={dataManagerOpen}
            onClose={() => setDataManagerOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <AppHeader
          onOpenDataManager={() => setDataManagerOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">工單</h2>
              <p className="text-sm text-slate-400">
                新增一筆或多筆工單，再推薦相容的構圖。
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasIncompleteData && (
                <div className="flex items-center gap-1 text-sm italic text-yellow-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-label="無資料"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  資料不完整將無法新增工單
                </div>
              )}
              <button
                type="button"
                onClick={handleAddBlankOrder}
                disabled={!canAddOrder}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
              >
                + 新增工單
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {orders.length === 0 && (
              <div className="rounded border border-dashed border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-400">
                尚無工單，新增一筆開始組裝提示詞。
              </div>
            )}

            {orders.map((order, index) => (
              <div key={order.id} className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-2 text-sm text-slate-400">工單 {index + 1}</div>
                <OrderInput value={order} onOrderChange={(patch) => updateOrder(order.id, patch)} />
                <button
                  type="button"
                  onClick={() => removeOrder(order.id)}
                  className="absolute right-4 top-4 text-sm text-red-400 hover:text-red-300"
                >
                  移除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRecommend}
              disabled={orders.length === 0 || compositions.length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              推薦構圖
            </button>

            {globalError && (
              <div role="alert" className="text-sm text-red-400">
                {globalError}
              </div>
            )}
          </div>
        </section>

        {Object.keys(compSelections).length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">構圖挑選</h2>
                <p className="text-sm text-slate-400">
                  取消勾選不想組裝的構圖。
                </p>
              </div>
              <button
                type="button"
                onClick={handleAssemble}
                disabled={Object.values(compSelections).every(
                  (selection) => selection.selectedCompCodes.length === 0,
                )}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
              >
                組裝提示詞
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {orders.map((order, index) => {
                const selection = compSelections[order.id];
                if (!selection) {
                  return null;
                }

                const recommended = compositions.filter((composition) =>
                  selection.recommendedCompCodes.includes(composition.code),
                );
                const pose = poses.find((p) => p.code === order.pose);
                const recommendedCodes = getRecommendedCompCodes(pose, compositions);

                return (
                  <div key={order.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300">工單 {index + 1}</h3>
                    <CompPicker
                      options={recommended}
                      recommendedCodes={recommendedCodes}
                      selected={selection.selectedCompCodes}
                      onChange={(codes) =>
                        setCompSelection(order.id, {
                          recommendedCompCodes: selection.recommendedCompCodes,
                          selectedCompCodes: codes,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {assembledPrompts.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">提示詞輸出</h2>
                <p className="text-sm text-slate-400">
                  可逐筆複製，或匯出為單一文字檔。
                </p>
              </div>
              <ExportButton prompts={assembledPrompts} />
            </div>

            <div className="mt-6 space-y-4">
              {assembledPrompts.map((assembledPrompt) => {
                const orderIndex = orders.findIndex((item) => item.id === assembledPrompt.orderId);
                const order = orders[orderIndex];
                if (!order) {
                  return null;
                }

                const outfitName = outfits.find((item) => item.code === order.outfit)?.name ?? order.outfit;
                const sceneName = scenes.find((item) => item.code === order.scene)?.name ?? order.scene;
                const poseName = poses.find((item) => item.code === order.pose)?.name ?? order.pose;
                const exprName = expressions.find((item) => item.code === order.expr)?.name ?? order.expr;
                const compName =
                  compositions.find((item) => item.code === assembledPrompt.compCode)?.name ??
                  assembledPrompt.compCode;
                const comboLabel = `${outfitName}_${sceneName}_${poseName}_${exprName}_${compName}`;

                return (
                  <PromptCard
                    key={`${assembledPrompt.orderId}-${assembledPrompt.compCode}`}
                    orderCode={`工單 ${orderIndex + 1} - ${order.outfit}_${order.scene}_${order.pose}_${order.expr}_${assembledPrompt.compCode}`}
                    tier={order.tier}
                    comboLabel={comboLabel}
                    prompt={assembledPrompt.prompt}
                    optimized={assembledPrompt.optimized}
                    optimizing={assembledPrompt.optimizing}
                    optimizingLanguage={assembledPrompt.optimizingLanguage}
                    optimizeError={assembledPrompt.optimizeError}
                    isConfigured={isConfigured(settings)}
                    onOptimize={() =>
                      handleOptimize(
                        assembledPrompt.orderId,
                        assembledPrompt.compCode,
                        assembledPrompt.prompt,
                      )
                    }
                    onRefreshLanguage={(language) =>
                      handleRefreshLanguage(
                        assembledPrompt.orderId,
                        assembledPrompt.compCode,
                        assembledPrompt.prompt,
                        language,
                      )
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => setSettings(next)}
        />
        <DataManagerModal
          open={dataManagerOpen}
          onClose={() => setDataManagerOpen(false)}
        />
      </div>
    </div>
  );
}
