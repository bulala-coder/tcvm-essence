export const CATEGORIES = {
  中藥: {
    label: '中藥',
    seal: '藥',
    accent: '#9C7A34',
    accentSoft: '#F1E7CE',
    keyInfoLabel: '性味歸經',
    indicationsLabel: '功效主治',
    coreLabel: '藥性本質',
    keyInfoPlaceholder: '例：辛、甘，微溫。歸肺、脾經。',
    indicationsPlaceholder: '例：發散風寒、行氣和胃……',
    corePlaceholder: '這味藥真正在做的事是什麼？它的氣機走向、與其他藥物的分野在哪裡？',
  },
  方劑: {
    label: '方劑',
    seal: '方',
    accent: '#3B5266',
    accentSoft: '#DEE7EC',
    keyInfoLabel: '組成',
    indicationsLabel: '主治',
    coreLabel: '方義本質',
    keyInfoPlaceholder: '例：桂枝、白芍、生薑、大棗、炙甘草',
    indicationsPlaceholder: '例：外感風寒表虛證，惡風發熱、汗出脈浮緩……',
    corePlaceholder: '這張方子的組方邏輯是什麼？君臣佐使如何配合達成一個什麼樣的氣機格局？',
  },
  針灸: {
    label: '針灸',
    seal: '針',
    accent: '#4F6B4A',
    accentSoft: '#E2E9DE',
    keyInfoLabel: '定位',
    indicationsLabel: '主治',
    coreLabel: '穴性本質',
    keyInfoPlaceholder: '例：小腿外側，犢鼻下 3 寸，脛骨前緣外一橫指',
    indicationsPlaceholder: '例：胃痛、嘔吐、腹脹、下肢痿痹……',
    corePlaceholder: '這個穴位在經絡系統中扮演的角色是什麼？為什麼是它，而不是鄰近的穴？',
  },
}

export const CATEGORY_LIST = Object.keys(CATEGORIES)

export const EFFECTS = [
  { value: '顯效', color: '#4F6B4A' },
  { value: '好轉', color: '#7A8F5C' },
  { value: '無效', color: '#8A8272' },
  { value: '惡化', color: '#AB3B2A' },
  { value: '待觀察', color: '#9C7A34' },
]

export function effectColor(effect) {
  return EFFECTS.find((e) => e.value === effect)?.color || '#8A8272'
}
