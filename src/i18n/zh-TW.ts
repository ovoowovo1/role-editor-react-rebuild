// Traditional Chinese translations
export const zhTW: Record<string, string> = {
  // EditorShell status bar
  'status.ready': '就緒',
  'status.importing': '正在匯入 {name}...',
  'status.imported': '已匯入 {name}',
  'status.importFailed': '匯入失敗：{message}',
  'status.merging': '正在合併 {name}...',
  'status.merged': '已合併 {name}',
  'status.mergeFailed': '合併失敗：{message}',
  'status.downloadedTwrole': '已下載舊版相容 .twrole 檔案',
  'status.exportedJson': '已匯出舊版相容精簡角色 JSON',
  'status.addedDeco': '已新增 {label}',
  'status.changedPart': '已將 {tab} 更換為 {label}',
  'status.createdGroup': '已從選取圖層建立群組',
  'status.renamedGroup': '已將群組重新命名為 {name}',
  'status.ungrouped': '已解散圖層群組',
  'status.previewWeapon': '預覽武器動畫：{label}',
  'status.addedColorBlock': '已新增色塊：{label}',

  // Insert Settings dialog
  'insert.title': '插入設定',
  'insert.target': '插入目標',
  'insert.listTop': '列表頂端',
  'insert.listBottom': '列表底端',
  'insert.belowIndex': '指定索引下方',
  'insert.visibleRow': '可見列編號（從 1 開始）',
  'insert.newItemsBelow': '新項目將插入到此可見列下方。',
  'insert.enterInteger': '請輸入 >= 1 的整數。',
  'insert.enableBelow': '啟用「指定索引下方」以編輯此值。',
  'insert.affectSources': '影響建立來源',
  'insert.scopePalette': '左側素材點擊新增',
  'insert.scopeCopy': '複製/貼上與鏡像複製',
  'insert.scopeMergeBatch': '合併 / 批次新增',
  'insert.cancel': '取消',
  'insert.save': '儲存',

  // Editor footer
  'footer.officialEditor': '官方編輯器前往',

  // EditControls toolbar
  'edit.cancelSelection': '取消選取',
  'edit.flipHorizontal': '水平翻轉',
  'edit.mirrorCopyH': '水平鏡像複製',
  'edit.mirrorCopyV': '垂直鏡像複製',
  'edit.face': '臉部（對齊舊版占位）',
  'edit.weaponAnimation': '武器動畫：{label}',
  'edit.startAnimation': '開始武器動畫',
  'edit.stopAnimation': '停止武器動畫',
  'edit.restartAnimation': '重新開始武器動畫',
  'edit.weaponPlayback': '武器動畫播放',
  'edit.iconToolbar': '圖示工具列',
  'edit.controls': '編輯控制項',
  'edit.start': '開始',
  'edit.stop': '停止',
  'edit.restart': '重新開始',

  // EditControls sliders
  'edit.rotate': '旋轉',
  'edit.scale': '縮放',
  'edit.ratio': '比例',
  'edit.posX': 'X 位置',
  'edit.posY': 'Y 位置',

  // EditControls stage
  'edit.selectedCount': '已選取 {count} 個',
  'edit.noLayer': '未選取圖層',
  'edit.stageMinus': '− 縮小',
  'edit.stagePlus': '+ 放大',

  // TopMenu
  'menu.import': '匯入',
  'menu.download': '下載',
  'menu.exportJson': '匯出 JSON',
  'menu.insertSettings': '插入設定',
  'menu.mergeFile': '合併檔案',
  'menu.undo': '復原 (Ctrl+Z)',
  'menu.redo': '重做 (Ctrl+Y)',
  'menu.shortcuts': '快捷鍵',
  'menu.shortcutsTitle': '角色編輯器常用快捷鍵',
  'menu.history': '歷史記錄控制項',
  'menu.camp': '陣營',
  'menu.gender': '性別',

  // TabBar
  'tabs.rolePart': '角色部位分頁',
  'tabs.deco': '裝飾',
  'tabs.head': '頭部',
  'tabs.hand': '手部',
  'tabs.foot': '腳部',
  'tabs.cape': '披風',
  'tabs.colorBlock': '色塊',

  // ChoiceGrid
  'choices.choices': '{tab} 選項',
  'choices.assetCountGaf': '{count} 個 GAF 素材',
  'choices.assetCountMock': '{count} 個模擬素材',
  'choices.gaf': 'GAF',

  // ColorBlockGrid
  'colorBlock.choices': '色塊選項',
  'colorBlock.title': '色塊',
  'colorBlock.count': '{count} 個色塊',
  'colorBlock.decoCount': '{count} 個裝飾',

  // LayerList
  'layers.title': '圖層',
  'layers.group': '群組',
  'layers.groupTitle': '從選取的未分組圖層建立群組',
  'layers.select': '選取',
  'layers.selectTitle': '依編號選取圖層，例如 1,2,3 或 1-5',
  'layers.hintGroups': '{count} 個群組 · 拖曳標題列來移動群組',
  'layers.hintNoGroups': '頭部為單例圖層 · Ctrl / Cmd 點擊可多選',
  'layers.clearSelection': '點擊空白區域以清除選取',
  'layers.addDeco': '新增裝飾以建立更多圖層',

  // LayerList Select dialog
  'layers.selectItems': '選取項目',
  'layers.itemNumbers': '項目編號（例如 1,2,3 或 1-5）',
  'layers.selectHelp': '輸入項目編號，以逗號或範圍分隔，例如 1-5,8,9。',
  'layers.cancel': '取消',
  'layers.selectButton': '選取',
  'layers.enterOne': '請至少輸入一個項目編號。',
  'layers.layerNotFound': '找不到圖層編號：{missing}',

  // Layer rows
  'layer.dragHandle': '拖曳圖層以重新排序或移動至群組',
  'layer.hide': '隱藏圖層',
  'layer.show': '顯示圖層',
  'layer.delete': '刪除圖層',
  'layer.headTitle': '頭部是來自原始 RoleDeco HEAD_CODE 項目的單例虛擬圖層',
  'layer.headDrag': '拖曳頭部圖層以變更順序或移入群組',
  'layer.headShow': '顯示頭部圖層',
  'layer.headHide': '隱藏頭部圖層',
  'layer.headCantDelete': '頭部不可刪除或複製',
  'layer.headName': '頭部',
  'layer.headSubtitle': 'head · 單例',
  'layer.groupDrag': '拖曳群組為一個區塊',
  'layer.groupExpand': '展開群組',
  'layer.groupCollapse': '收合群組',
  'layer.groupName': '群組名稱',
  'layer.groupLayers': '{count} 個圖層',
  'layer.rename': '重新命名群組',
  'layer.edit': '編輯',
  'layer.groupShow': '顯示群組',
  'layer.groupHide': '隱藏群組',
  'layer.ungroup': '解散群組',

  // ShortcutHelp
  'shortcuts.title': '角色編輯器常用快捷鍵',
  'shortcuts.macHint': 'macOS 可用 Cmd 取代 Ctrl',
  'shortcuts.close': '關閉',
  'shortcuts.undo': '復原',
  'shortcuts.redo': '重做',
  'shortcuts.copy': '複製選取物件',
  'shortcuts.paste': '貼上已複製物件',
  'shortcuts.selectAll': '全選物件（含頭部）',
  'shortcuts.group': '將選取物件建立群組',
  'shortcuts.moveTop': '將選取物件移到最上層',
  'shortcuts.moveBottom': '將選取物件移到最下層',
  'shortcuts.moveUp': '向上移動選取物件',
  'shortcuts.moveDown': '向下移動選取物件',
  'shortcuts.moveLeft': '向左移動選取物件',
  'shortcuts.moveRight': '向右移動選取物件',
  'shortcuts.rotateCW': '順時針旋轉選取物件',
  'shortcuts.rotateCCW': '逆時針旋轉選取物件',
  'shortcuts.scaleUp': '放大選取物件',
  'shortcuts.scaleDown': '縮小選取物件',
  'shortcuts.ratioUp': '增加長寬比',
  'shortcuts.ratioDown': '降低長寬比',
  'shortcuts.deleteSelected': '刪除選取物件',

  // WeaponAnimation
  'weapon.title': '武器動畫',
  'weapon.default': '預設',
  'weapon.close': '關閉',
  'weapon.sequences': '武器動畫序列',
  'weapon.noSequences': '找不到角色身體動畫序列。',

  // CharacterStage
  'stage.help': '在畫布上拖曳已選取的裝飾',

  // AssetPreview
  'asset.missingTexture': 'Atlas PNG 遺失或載入失敗',
  'asset.missingLabel': '遺失貼圖',

  // Gender
  'gender.male': '男性',
  'gender.female': '女性',

  // GAF display
  'gaf.source': '來自 {texture}',
};
