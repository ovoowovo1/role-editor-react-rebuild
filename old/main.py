from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os

# 設定靜態檔案目錄為當前目錄
app = Flask(__name__, static_folder='.')
CORS(app)  # 允許跨域請求，避免瀏覽器擋下

# 1. 模擬 API 回傳 (解決你的主要問題)
@app.route('/svr/get/glt_url', methods=['POST', 'GET'])
def mock_glt_url():
    # 這裡回傳你提供的 JSON 數據
    return jsonify({
        "gltUrl": "https://gamelet.online",
        "unused": [
            "6162636465666768696a6b6c6d6e6f707172737475767778797a3132333435363738392c736572766963652c6d6574686f642c706172616d732c706f73742c6765742c746f4c6f77657243617365",
            "7569642c7369672c402c2f2c2e2c492c702c6a736f6e7270632c636d642c732c286d61784b61292c73706c69742c6a6f696e2c6c656e6774682c6368617241742c746f6b656e2c74696d65436f64652c7365637572652c34"
        ]
    })

# 2. 處理首頁 (index.html)
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# 3. 處理其他靜態檔案 (如 .js, .css, .png)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    # 在 Port 5500 運行，模擬你原本的 Live Server 環境
    print("Server running on http://127.0.0.1:5500")
    app.run(port=5500, debug=True)