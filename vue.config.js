module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      // List native deps here if they don't work
      externals: ['serialport'],
      // If you are using Yarn Workspaces, you may have multiple node_modules folders
      // List them all here so that VCP Electron Builder can find them
      // nodeModulesPath: ['../../node_modules', './node_modules']

      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
        'appId': 'cc.seeed.sensecap.tool.node',
        'productName': 'SenseCAP Node Configuration Tool',
        'copyright': 'Copyright ©2008-2020 Seeed Technology Co.,Ltd.',
        'nsis': {
          'installerIcon': 'build/icon.ico',
          'installerHeader': 'build/icon.png',
          'installerHeaderIcon': 'build/icon.ico',
          'oneClick': false,
          'allowToChangeInstallationDirectory': true,
          'runAfterFinish': false
        },
        'win': {
          'target': ['nsis', 'portable'],
          'icon': 'build/icon.ico',
        },
        'dmg': {
          'title': 'SenseCAP Node Configuration Tool',
          'icon': 'build/icon.png',
          'contents': [
            {
              'x': 100,
              'y': 200
            },
            {
              'x': 400,
              'y': 200,
              'type': 'link',
              'path': '/Applications'
            }
          ],
        },
        'mac': {
          'category': 'public.app-category.developer-tools',
          'target': 'default',
          'icon': 'build/icon.png',
          "hardenedRuntime" : true,
          "gatekeeperAssess": false,
          "entitlements": "build/entitlements.mac.plist",
          "entitlementsInherit": "build/entitlements.mac.plist"
        },
        "afterSign": "scripts/notarize.js",
        "linux": {
          "target": ["AppImage", "deb"],
          "icon": "build/iconset"
        },
        "publish": "github"
      }
    }
  }
}