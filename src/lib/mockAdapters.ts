import { camps, findOptionByCode, optionById, partOptions, tabLabels } from '../mock/options';
import type { BodyPartTab, PartOption, PartTab } from '../types/role';

export interface RuntimeResourceAdapter {
  getPartOptions(tab: PartTab): PartOption[];
  getOption(id: string): PartOption | undefined;
  resolveLegacyCode(tab: PartTab, code: string): PartOption | undefined;
  translate(key: string): string;
  playSfx(name: string): void;
}

const translations: Record<string, string> = {
  'roleEditor.title': 'Role Editor',
  'roleEditor.btn.importRole': 'Import',
  'roleEditor.btn.downloadRole': 'Download',
  'roleEditor.btn.exportJson': 'Export JSON',
  'roleEditor.btn.newDesign': 'New Design',
  'roleEditor.btn.saveRole': 'Save',
  'roleEditor.hotkey.rotate': 'Hotkey: C/V',
  'roleEditor.hotkey.scale': 'Hotkey: Z/X',
  'roleEditor.hotkey.ratio': 'Hotkey: shift + Z/X',
  'roleEditor.allowMultiSelect': 'Hold Ctrl/Cmd to add selection'
};

export const runtimeAdapter: RuntimeResourceAdapter = {
  getPartOptions(tab) {
    return partOptions[tab];
  },
  getOption(id) {
    return optionById[id];
  },
  resolveLegacyCode(tab, code) {
    return findOptionByCode(tab, code);
  },
  translate(key) {
    if (key.startsWith('roleEditor.tab.')) {
      const tab = key.replace('roleEditor.tab.', '') as PartTab;
      return tabLabels[tab] ?? key;
    }
    if (key.startsWith('tw.label.')) {
      const campCode = key.replace('tw.label.', '');
      return camps.find((camp) => camp.code === campCode)?.name ?? key;
    }
    return translations[key] ?? key;
  },
  playSfx(name) {
    console.info(`[mock-sfx] ${name}`);
  }
};

export function bodyPartTabs(): BodyPartTab[] {
  return ['head', 'hand', 'foot', 'cape'];
}
