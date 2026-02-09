class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.strokes = [];
        this.currentStroke = [];
        this.lastPoint = null;
        this.lastTime = null;
        this.recognitionTimeout = null;
        this.recognitionDelay = 800; // Délai en ms après avoir arrêté d'écrire
        
        this.setupCanvas();
        this.setupEventListeners();
    }
    
    setupCanvas() {
        this.canvas.width = 700;
        this.canvas.height = 400;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
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
        
        // Annuler la reconnaissance en attente
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
        }
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    draw(event) {
        if (!this.isDrawing) return;
        
        const point = this.getCoordinates(event);
        const dx = point.x - this.lastPoint.x;
        const dy = point.y - this.lastPoint.y;
        const dt = point.time - this.lastTime;
        
        this.currentStroke.push({
            x: point.x,
            y: point.y,
            time: point.time,
            dx: dx,
            dy: dy,
            dt: dt
        });
        
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
            
            // ⚡ RECONNAISSANCE AUTOMATIQUE après délai
            this.scheduleRecognition();
        }
        this.isDrawing = false;
        this.lastPoint = null;
    }
    
    scheduleRecognition() {
        // Annuler la reconnaissance précédente
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
        }
        
        // Programmer une nouvelle reconnaissance
        this.recognitionTimeout = setTimeout(() => {
            this.recognize();
        }, this.recognitionDelay);
    }
    
    async recognize() {
        if (this.strokes.length === 0) return;
        
        const resultDiv = document.getElementById('result');
        const confidenceDiv = document.getElementById('confidence');
        
        resultDiv.textContent = '⏳ Reconnaissance...';
        resultDiv.className = 'result-text recognizing';
        confidenceDiv.textContent = '';
        
        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ strokes: this.strokes })
            });
            
            const data = await response.json();
            
            if (data.success) {
                resultDiv.textContent = `"${data.prediction}"`;
                resultDiv.className = 'result-text success';
                confidenceDiv.textContent = `Confiance: ${(data.confidence * 100).toFixed(1)}%`;
            } else {
                resultDiv.textContent = '❌ Erreur: ' + data.error;
                resultDiv.className = 'result-text error';
            }
        } catch (error) {
            resultDiv.textContent = '❌ Erreur de connexion';
            resultDiv.className = 'result-text error';
            console.error('Error:', error);
        }
    }
    
    clear() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokes = [];
        this.currentStroke = [];
        
        // Annuler la reconnaissance en attente
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
        }
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
    resultDiv.className = 'result-text';
    confidenceDiv.textContent = '';
});

// Bouton Reconnaître manuel (optionnel, garde-le au cas où)
document.getElementById('recognizeBtn').addEventListener('click', () => {
    drawingCanvas.recognize();
});

// Test de connexion au démarrage
fetch('/api/health')
    .then(res => res.json())
    .then(data => {
        console.log('✅ Backend connecté:', data);
        resultDiv.textContent = '✅ Prêt ! Écrivez quelque chose...';
    })
    .catch(err => {
        console.error('❌ Backend non disponible:', err);
        resultDiv.textContent = '❌ Serveur non disponible';
    });