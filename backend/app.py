from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json

app = Flask(__name__, 
            template_folder='../frontend/templates',
            static_folder='../frontend/static')
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    """Endpoint pour la reconnaissance d'écriture"""
    try:
        data = request.json
        strokes = data.get('strokes', [])
        
        # TODO: Intégrer le modèle OnlineHTR ici
        # Pour l'instant, retourne un texte de test
        prediction = "Modèle non encore intégré - Test OK"
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'confidence': 0.95
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Vérifier que l'API fonctionne"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)