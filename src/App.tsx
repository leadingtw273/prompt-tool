import { useState } from 'react';
import { CompPicker } from '@/components/CompPicker';
import { ExportButton } from '@/components/ExportButton';
import { OrderInput } from '@/components/OrderInput';
import { PromptCard } from '@/components/PromptCard';
import { SettingsModal } from '@/components/SettingsModal';
import { isCompCompatible, isOrderForbidden } from '@/lib/compatibility';
import { recommendComps } from '@/lib/compRecommender';
import {
  loadCharacter,
  loadCompositions,
  loadCompCompatibility,
  loadExpressions,
  loadForbiddenCombinations,
  loadOutfits,
  loadPoses,
  loadScenes,
  loadTierConstraints,
} from '@/lib/dataLoader';
import { assemblePrompt } from '@/lib/promptAssembler';
import { optimizePrompt } from '@/lib/aiOptimize';
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
  const toggleComp = useOrderStore((state) => state.toggleComp);
  const setAssembledPrompts = useOrderStore((state) => state.setAssembledPrompts);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const setOptimizing = useOrderStore((state) => state.setOptimizing);
  const setOptimizedResult = useOrderStore((state) => state.setOptimizedResult);
  const setOptimizeError = useOrderStore((state) => state.setOptimizeError);

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const character = loadCharacter('ACC-001');
  const outfits = loadOutfits();
  const scenes = loadScenes();
  const poses = loadPoses();
  const expressions = loadExpressions();
  const compositions = loadCompositions();
  const tierConstraints = loadTierConstraints();
  const compCompatibility = loadCompCompatibility();
  const forbiddenCombinations = loadForbiddenCombinations();

  function handleAddBlankOrder() {
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
    setGlobalError(null);
    setAssembledPrompts([]);

    for (const order of orders) {
      const forbidden = isOrderForbidden(order, forbiddenCombinations);
      if (forbidden.forbidden) {
        setGlobalError(`Order ${order.id}: ${forbidden.reason}`);
        return;
      }

      const compatiblePool = compositions.filter((composition) =>
        isCompCompatible(
          composition,
          {
            pose: order.pose,
            outfit: order.outfit,
            scene: order.scene,
          },
          compCompatibility,
        ),
      );

      const recommended = recommendComps({ pool: compatiblePool, n: 5 });

      setCompSelection(order.id, {
        recommendedCompCodes: recommended.map((composition) => composition.code),
        selectedCompCodes: [],
      });
    }
  }

  function handleAssemble() {
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

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="relative rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Prompt Tool
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">AI 虛擬網紅提示詞產生器</h1>
          <p className="mt-2 text-sm text-slate-400">
            角色：{character.display_name}（{character.character_id}）
          </p>
          <button
            type="button"
            aria-label="設定"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-6 top-6 rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">工單</h2>
              <p className="text-sm text-slate-400">
                新增一筆或多筆工單，再推薦相容的構圖。
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddBlankOrder}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
            >
              + 新增工單
            </button>
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
              disabled={orders.length === 0}
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

                return (
                  <div key={order.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300">工單 {index + 1}</h3>
                    <CompPicker
                      recommended={recommended}
                      selected={selection.selectedCompCodes}
                      onToggle={(compCode) => toggleComp(order.id, compCode)}
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
              {assembledPrompts.map((assembledPrompt, index) => {
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
                    key={`${assembledPrompt.orderId}-${assembledPrompt.compCode}-${index}`}
                    orderCode={`工單 ${orderIndex + 1} - ${order.outfit}_${order.scene}_${order.pose}_${order.expr}_${assembledPrompt.compCode}`}
                    tier={order.tier}
                    comboLabel={comboLabel}
                    prompt={assembledPrompt.prompt}
                    optimized={assembledPrompt.optimized}
                    optimizing={assembledPrompt.optimizing}
                    optimizeError={assembledPrompt.optimizeError}
                    isConfigured={isConfigured(settings)}
                    onOptimize={() =>
                      handleOptimize(
                        assembledPrompt.orderId,
                        assembledPrompt.compCode,
                        assembledPrompt.prompt,
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
      </div>
    </div>
  );
}
