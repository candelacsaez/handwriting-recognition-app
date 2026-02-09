class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.strokes = []; // Stocke tous les traits
        this.currentStroke = []; // Trait en cours
        this.lastPoint = null;
        this.lastTime = null;
        
        this.setupCanvas();
        this.setupEventListeners();
    }
    
    setupCanvas() {
        // Taille du canvas
        this.canvas.width = 700;
        this.canvas.height = 400;
        
        // Style du tracé
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Fond blanc
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    setupEventListeners() {
        // Support souris
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Support tactile (tablette/stylet)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
        });
    }
    
    getCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            time: Date.now()
        };
    }
    
    startDrawing(event) {
        this.isDrawing = true;
        const point = this.getCoordinates(event);
        this.lastPoint = point;
        this.lastTime = point.time;
        this.currentStroke = [point];
        
        // Dessiner le point de départ
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    draw(event) {
        if (!this.isDrawing) return;
        
        const point = this.getCoordinates(event);
        
        // Calculer les différences (format OnlineHTR)
        const dx = point.x - this.lastPoint.x;
        const dy = point.y - this.lastPoint.y;
        const dt = point.time - this.lastTime;
        
        // Stocker le point avec ses métadonnées
        this.currentStroke.push({
            x: point.x,
            y: point.y,
            time: point.time,
            dx: dx,
            dy: dy,
            dt: dt
        });
        
        // Dessiner la ligne
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
        
        this.lastPoint = point;
        this.lastTime = point.time;
    }
    
    stopDrawing() {
        if (this.isDrawing && this.currentStroke.length > 0) {
            this.strokes.push([...this.currentStroke]);
            this.currentStroke = [];
        }
        this.isDrawing = false;
        this.lastPoint = null;
    }
    
    clear() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokes = [];
        this.currentStroke = [];
    }
    
    getStrokes() {
        return this.strokes;
    }
}

// Initialisation
const drawingCanvas = new DrawingCanvas('drawingCanvas');
const resultDiv = document.getElementById('result');
const confidenceDiv = document.getElementById('confidence');

// Bouton Effacer
document.getElementById('clearBtn').addEventListener('click', () => {
    drawingCanvas.clear();
    resultDiv.textContent = 'Écrivez quelque chose...';
    confidenceDiv.textContent = '';
});

// Bouton Reconnaître
document.getElementById('recognizeBtn').addEventListener('click', async () => {
    const strokes = drawingCanvas.getStrokes();
    
    if (strokes.length === 0) {
        resultDiv.textContent = '❌ Aucun tracé détecté';
        return;
    }
    
    resultDiv.textContent = '⏳ Reconnaissance en cours...';
    confidenceDiv.textContent = '';
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ strokes: strokes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.textContent = `"${data.prediction}"`;
            confidenceDiv.textContent = `Confiance: ${(data.confidence * 100).toFixed(1)}%`;
        } else {
            resultDiv.textContent = '❌ Erreur: ' + data.error;
        }
    } catch (error) {
        resultDiv.textContent = '❌ Erreur de connexion au serveur';
        console.error('Error:', error);
    }
});

// Test de connexion au démarrage
fetch('/api/health')
    .then(res => res.json())
    .then(data => console.log('✅ Backend connecté:', data))
    .catch(err => console.error('❌ Backend non disponible:', err));