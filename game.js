// Flappy Bird Recreation Engine
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const soundBtn = document.getElementById('soundBtn');
  const themeBtn = document.getElementById('themeBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseScreen = document.getElementById('pauseScreen');
  const resumeBtn = document.getElementById('resumeBtn');

  // Virtual resolution for classic crisp arcade proportions
  const V_WIDTH = 360;
  const V_HEIGHT = 640;
  let scale = 1;

  // Game States
  const STATE = {
    START: 0,
    PLAYING: 1,
    GAMEOVER: 2
  };
  let currentState = STATE.START;
  let isPaused = false;
  let isNight = false;

  // Frame timing
  let frames = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('flappy_high_score') || '0', 10);
  let isNewHighScore = false;

  // Juice & FX
  let screenShake = 0;
  let flashAlpha = 0;
  let particles = [];
  let scorePopups = [];

  // Theme palettes
  const THEMES = {
    day: {
      sky: '#4ec0ca',
      cloud: 'rgba(255, 255, 255, 0.85)',
      cityBack: '#c9e8aa',
      cityFront: '#8bd177',
      pipeBody: '#73bf2e',
      pipeBorder: '#558022',
      pipeHighlight: '#9ce659',
      pipeShadow: '#496d19',
      groundTop: '#73bf2e',
      groundBorder: '#543847',
      groundBody: '#ded895',
      groundStripe: '#c8b965',
      textColor: '#ffffff',
      textStroke: '#543847'
    },
    night: {
      sky: '#0f1a2e',
      cloud: 'rgba(60, 80, 110, 0.45)',
      cityBack: '#16233d',
      cityFront: '#1f3459',
      pipeBody: '#5e9934',
      pipeBorder: '#365319',
      pipeHighlight: '#7ec449',
      pipeShadow: '#284210',
      groundTop: '#558022',
      groundBorder: '#231b26',
      groundBody: '#8b845c',
      groundStripe: '#6e6744',
      textColor: '#ffffff',
      textStroke: '#231b26'
    }
  };

  // Parallax offsets
  let cloudOffset = 0;
  let cityOffset = 0;
  let groundOffset = 0;

  // Ground measurements
  const GROUND_HEIGHT = 112;
  const groundY = V_HEIGHT - GROUND_HEIGHT;

  // Bird Entity
  const bird = {
    x: 82,
    y: 280,
    radius: 14,
    gravity: 0.38,
    jumpPower: -7.0,
    velocity: 0,
    rotation: 0,
    flapAnimSpeed: 7,
    wingState: 0, // 0: down, 1: mid, 2: up
    deadTimer: 0,

    reset() {
      this.x = 82;
      this.y = 280;
      this.velocity = 0;
      this.rotation = 0;
      this.wingState = 1;
      this.deadTimer = 0;
    },

    flap() {
      if (currentState === STATE.GAMEOVER) return;

      this.velocity = this.jumpPower;
      this.rotation = -25 * (Math.PI / 180);
      sounds.playFlap();

      // Emit jump particles
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: this.x - 8,
          y: this.y + 4 + (Math.random() * 6 - 3),
          vx: -(Math.random() * 1.5 + 1),
          vy: Math.random() * 2 - 1,
          size: Math.random() * 4 + 3,
          alpha: 0.9,
          color: '#ffffff'
        });
      }
    },

    update() {
      // Start state hovering animation
      if (currentState === STATE.START) {
        this.y = 280 + Math.sin(frames * 0.08) * 6;
        this.rotation = 0;
        if (frames % 8 === 0) {
          this.wingState = (this.wingState + 1) % 3;
        }
        return;
      }

      // Physics in play & gameover
      this.velocity += this.gravity;
      this.y += this.velocity;

      // Terminal velocity
      if (this.velocity > 9) this.velocity = 9;

      // Rotation logic
      if (this.velocity < 0) {
        this.rotation = -22 * (Math.PI / 180);
      } else {
        this.rotation += 4 * (Math.PI / 180);
        const maxTilt = 80 * (Math.PI / 180);
        if (this.rotation > maxTilt) this.rotation = maxTilt;
      }

      // Wing flapping animation
      if (currentState === STATE.PLAYING) {
        if (this.velocity < 2) {
          if (frames % 5 === 0) {
            this.wingState = (this.wingState + 1) % 3;
          }
        } else {
          this.wingState = 1; // glide
        }
      }

      // Ground collision
      if (this.y + this.radius >= groundY) {
        this.y = groundY - this.radius;
        if (currentState === STATE.PLAYING) {
          triggerGameOver(true);
        }
      }

      // Ceiling limit
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.velocity = 0;
      }
    },

    draw(theme) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // Bird Body (Flappy Yellow-Orange)
      ctx.fillStyle = '#f7e025';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2.5;

      // Main oval body
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Belly color
      ctx.fillStyle = '#f3b827';
      ctx.beginPath();
      ctx.ellipse(-2, 4, 11, 7, 0, 0, Math.PI);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(9, -5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f75c00';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(11, -1);
      ctx.lineTo(21, 2);
      ctx.lineTo(11, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Beak middle line
      ctx.beginPath();
      ctx.moveTo(11, 3);
      ctx.lineTo(19, 3);
      ctx.stroke();

      // Wing
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.wingState === 0) {
        // Wing down
        ctx.ellipse(-6, 4, 7, 4, 0.4, 0, Math.PI * 2);
      } else if (this.wingState === 1) {
        // Wing middle
        ctx.ellipse(-6, 0, 7, 4, 0, 0, Math.PI * 2);
      } else {
        // Wing up
        ctx.ellipse(-6, -4, 7, 4, -0.4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  };

  // Pipes Array & Management
  const pipes = {
    items: [],
    width: 54,
    gap: 122,
    capHeight: 24,
    capOverhang: 4,
    speed: 2.3,
    spawnInterval: 95,

    reset() {
      this.items = [];
    },

    update() {
      if (currentState !== STATE.PLAYING) return;

      // Spawn new pipe
      if (frames % this.spawnInterval === 0) {
        const minTop = 60;
        const maxTop = groundY - this.gap - 60;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

        this.items.push({
          x: V_WIDTH,
          top: topHeight,
          bottom: groundY - (topHeight + this.gap),
          passed: false
        });
      }

      // Move and check pipes
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.x -= this.speed;

        // Collision Check (Hitbox slightly smaller for fairness)
        const hitPadding = 3;
        const birdLeft = bird.x - bird.radius + hitPadding;
        const birdRight = bird.x + bird.radius - hitPadding;
        const birdTop = bird.y - bird.radius + hitPadding;
        const birdBottom = bird.y + bird.radius - hitPadding;

        const pipeLeft = p.x - this.capOverhang;
        const pipeRight = p.x + this.width + this.capOverhang;
        const topPipeBottom = p.top;
        const bottomPipeTop = p.top + this.gap;

        // Pipe collision
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
            triggerGameOver(false);
          }
        }

        // Score passed
        if (!p.passed && p.x + this.width / 2 < bird.x) {
          p.passed = true;
          score++;
          sounds.playPoint();

          // Floating score indicator
          scorePopups.push({
            x: bird.x,
            y: bird.y - 15,
            text: '+1',
            alpha: 1.0,
            vy: -1.2
          });
        }

        // Remove offscreen pipes
        if (p.x + this.width + 10 < 0) {
          this.items.splice(i, 1);
        }
      }
    },

    draw(theme) {
      for (const p of this.items) {
        // --- Top Pipe ---
        this.renderSinglePipe(p.x, 0, p.top, true, theme);

        // --- Bottom Pipe ---
        const bottomY = p.top + this.gap;
        this.renderSinglePipe(p.x, bottomY, p.bottom, false, theme);
      }
    },

    renderSinglePipe(x, y, height, isTop, theme) {
      if (height <= 0) return;

      const capH = this.capHeight;
      const over = this.capOverhang;
      const capY = isTop ? y + height - capH : y;
      const bodyY = isTop ? y : y + capH;
      const bodyH = Math.max(0, height - capH);

      ctx.save();

      // Pipe Body
      ctx.fillStyle = theme.pipeBody;
      ctx.fillRect(x, bodyY, this.width, bodyH);

      // Body Highlights and Shadows (Retro 3D shading)
      ctx.fillStyle = theme.pipeHighlight;
      ctx.fillRect(x + 4, bodyY, 6, bodyH); // Light vertical strip

      ctx.fillStyle = theme.pipeShadow;
      ctx.fillRect(x + this.width - 8, bodyY, 6, bodyH); // Dark vertical strip

      // Body Borders
      ctx.strokeStyle = theme.pipeBorder;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, bodyY, this.width, bodyH);

      // Pipe Cap (Wider lip)
      const capX = x - over;
      const capW = this.width + over * 2;

      ctx.fillStyle = theme.pipeBody;
      ctx.fillRect(capX, capY, capW, capH);

      ctx.fillStyle = theme.pipeHighlight;
      ctx.fillRect(capX + 4, capY, 7, capH);

      ctx.fillStyle = theme.pipeShadow;
      ctx.fillRect(capX + capW - 9, capY, 7, capH);

      // Lip underside shadow
      if (!isTop) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, bodyY, this.width, 4);
      }

      ctx.strokeStyle = theme.pipeBorder;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(capX, capY, capW, capH);

      ctx.restore();
    }
  };

  // Background scenery
  function drawBackground(theme) {
    // Sky
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Stars at night
    if (isNight) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 30; i++) {
        const starX = (i * 47) % V_WIDTH;
        const starY = (i * 31) % (groundY - 140);
        const starS = (i % 3 === 0) ? 2 : 1.2;
        const blink = Math.sin(frames * 0.05 + i) > 0.3 ? 1 : 0.4;
        ctx.globalAlpha = blink;
        ctx.fillRect(starX, starY, starS, starS);
      }
      ctx.globalAlpha = 1.0;

      // Moon
      ctx.fillStyle = '#fef5cb';
      ctx.beginPath();
      ctx.arc(V_WIDTH - 60, 80, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.sky;
      ctx.beginPath();
      ctx.arc(V_WIDTH - 68, 76, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clouds (Slow parallax)
    ctx.fillStyle = theme.cloud;
    const cWidth = 90;
    for (let i = -1; i < 5; i++) {
      const cx = (i * 120 - (cloudOffset % 120));
      const cy = 180 + (i % 2) * 25;
      drawCloud(cx, cy);
    }

    // Distant City Skyline / Hills (Medium parallax)
    ctx.fillStyle = theme.cityBack;
    for (let i = -1; i < 6; i++) {
      const bx = (i * 80 - (cityOffset % 80));
      const bH = 65 + (i * 19) % 45;
      ctx.fillRect(bx, groundY - bH, 65, bH);
    }

    ctx.fillStyle = theme.cityFront;
    for (let i = -1; i < 7; i++) {
      const bx = (i * 65 - ((cityOffset * 1.3) % 65));
      const bH = 45 + (i * 23) % 35;
      ctx.fillRect(bx, groundY - bH, 50, bH);
    }
  }

  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 16, 0, Math.PI * 2);
    ctx.arc(x + 40, y + 5, 20, 0, Math.PI * 2);
    ctx.arc(x + 60, y + 10, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground rendering with moving diagonal stripes
  function drawGround(theme) {
    ctx.save();

    // Top Green Grass Strip
    ctx.fillStyle = theme.groundTop;
    ctx.fillRect(0, groundY, V_WIDTH, 14);

    // Dark accent line below grass
    ctx.fillStyle = theme.groundBorder;
    ctx.fillRect(0, groundY + 12, V_WIDTH, 3);

    // Sand/Soil Body
    ctx.fillStyle = theme.groundBody;
    ctx.fillRect(0, groundY + 15, V_WIDTH, GROUND_HEIGHT - 15);

    // Moving diagonal stripes for arcade depth
    ctx.fillStyle = theme.groundStripe;
    const stripeSpacing = 20;
    const stripeW = 9;
    const offset = groundOffset % stripeSpacing;

    for (let x = -stripeSpacing; x < V_WIDTH + stripeSpacing; x += stripeSpacing) {
      ctx.beginPath();
      ctx.moveTo(x - offset, groundY + 15);
      ctx.lineTo(x - offset + stripeW, groundY + 15);
      ctx.lineTo(x - offset - 15 + stripeW, groundY + GROUND_HEIGHT);
      ctx.lineTo(x - offset - 15, groundY + GROUND_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Top border outline
    ctx.strokeStyle = theme.groundBorder;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(V_WIDTH, groundY);
    ctx.stroke();

    ctx.restore();
  }

  // Draw current score during gameplay
  function drawScoreHUD() {
    if (currentState === STATE.PLAYING) {
      ctx.save();
      ctx.font = '28px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Drop shadow / border
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#543847';
      ctx.strokeText(score, V_WIDTH / 2, 50);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(score, V_WIDTH / 2, 50);
      ctx.restore();
    }
  }

  // Start Screen UI
  function drawStartScreen() {
    if (currentState !== STATE.START) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Title: FLAPPY BIRD
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#543847';
    ctx.strokeText('FLAPPY BIRD', V_WIDTH / 2, 160);
    ctx.fillStyle = '#f7e025';
    ctx.fillText('FLAPPY BIRD', V_WIDTH / 2, 160);

    // GET READY banner
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.strokeText('GET READY', V_WIDTH / 2, 220);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GET READY', V_WIDTH / 2, 220);

    // Instructions Box
    const blink = Math.floor(frames / 30) % 2 === 0;
    if (blink) {
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#543847';
      ctx.strokeText('TAP / SPACE TO FLY', V_WIDTH / 2, 385);
      ctx.fillStyle = '#fff';
      ctx.fillText('TAP / SPACE TO FLY', V_WIDTH / 2, 385);
    }

    // Tap finger icon animation
    drawTapPrompt(V_WIDTH / 2, 425);

    // Best Score Badge
    if (highScore > 0) {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#543847';
      ctx.fillText(`BEST SCORE: ${highScore}`, V_WIDTH / 2, 490);
    }

    ctx.restore();
  }

  function drawTapPrompt(x, y) {
    const bob = Math.sin(frames * 0.1) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.font = '26px sans-serif';
    ctx.fillText('👆', 0, 0);
    ctx.restore();
  }

  // Game Over Board UI
  let gameOverCardY = V_HEIGHT;
  function drawGameOverScreen() {
    if (currentState !== STATE.GAMEOVER) return;

    // Slide in animation for scoreboard
    gameOverCardY += (220 - gameOverCardY) * 0.15;

    ctx.save();
    ctx.textAlign = 'center';

    // Title: GAME OVER
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#543847';
    ctx.strokeText('GAME OVER', V_WIDTH / 2, 140);
    ctx.fillStyle = '#e86101';
    ctx.fillText('GAME OVER', V_WIDTH / 2, 140);

    // Scoreboard card
    const cardW = 280;
    const cardH = 150;
    const cardX = (V_WIDTH - cardW) / 2;
    const cardY = gameOverCardY;

    // Outer card border & fill
    ctx.fillStyle = '#ded895';
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 4;
    roundRect(ctx, cardX, cardY, cardW, cardH, 10, true, true);

    // Medal area
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#e86101';
    ctx.textAlign = 'left';
    ctx.fillText('MEDAL', cardX + 24, cardY + 34);

    drawMedal(cardX + 48, cardY + 80, score);

    // Score Text
    ctx.textAlign = 'right';
    ctx.fillStyle = '#543847';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('SCORE', cardX + cardW - 24, cardY + 34);

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(score, cardX + cardW - 24, cardY + 58);

    // High Score Text
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#543847';
    ctx.fillText('BEST', cardX + cardW - 24, cardY + 90);

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(highScore, cardX + cardW - 24, cardY + 114);

    // New High Score Badge
    if (isNewHighScore) {
      ctx.fillStyle = '#e82525';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('NEW!', cardX + cardW - 75, cardY + 90);
    }

    // Play Again Button (Canvas rendered for seamless feel)
    if (gameOverCardY < 230) {
      const btnW = 160;
      const btnH = 44;
      const btnX = (V_WIDTH - btnW) / 2;
      const btnY = cardY + cardH + 25;

      ctx.fillStyle = '#e86101';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      roundRect(ctx, btnX, btnY, btnW, btnH, 8, true, true);

      // Button drop shadow border
      ctx.strokeStyle = '#a33b00';
      ctx.lineWidth = 3;
      ctx.strokeRect(btnX - 2, btnY - 2, btnW + 4, btnH + 4);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('PLAY AGAIN', V_WIDTH / 2, btnY + 28);
    }

    ctx.restore();
  }

  function drawMedal(x, y, scr) {
    let medalColor = null;
    let medalName = '';

    if (scr >= 40) {
      medalColor = '#60e6e6'; // Platinum
      medalName = 'PLATINUM';
    } else if (scr >= 30) {
      medalColor = '#ffcf10'; // Gold
      medalName = 'GOLD';
    } else if (scr >= 20) {
      medalColor = '#d6d9dc'; // Silver
      medalName = 'SILVER';
    } else if (scr >= 10) {
      medalColor = '#d97d38'; // Bronze
      medalName = 'BRONZE';
    }

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = medalColor ? medalColor : 'rgba(0,0,0,0.1)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#543847';
    ctx.stroke();

    if (medalColor) {
      // Inner star/glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#a09880';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', x, y + 6);
    }
  }

  function roundRect(context, x, y, width, height, radius, fill, stroke) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    if (fill) context.fill();
    if (stroke) context.stroke();
  }

  // Particle & FX updates
  function updateAndDrawFX() {
    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      p.size = Math.max(0, p.size - 0.1);

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const sp = scorePopups[i];
      sp.y += sp.vy;
      sp.alpha -= 0.025;

      if (sp.alpha <= 0) {
        scorePopups.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#543847';
      ctx.strokeText(sp.text, sp.x, sp.y);
      ctx.fillStyle = '#ffdf00';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }

    // Screen Flash on death
    if (flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      ctx.restore();
      flashAlpha -= 0.06;
      if (flashAlpha < 0) flashAlpha = 0;
    }
  }

  // Game Over trigger
  function triggerGameOver(hitGround) {
    if (currentState === STATE.GAMEOVER) return;

    currentState = STATE.GAMEOVER;
    gameOverCardY = V_HEIGHT;

    // Camera shake & white flash
    screenShake = 10;
    flashAlpha = 0.8;

    if (hitGround) {
      sounds.playDie();
    } else {
      sounds.playHit();
      setTimeout(() => sounds.playDie(), 140);
    }

    // Check high score
    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      localStorage.setItem('flappy_high_score', highScore.toString());
    } else {
      isNewHighScore = false;
    }
  }

  // Primary Action (Flap / Start / Restart)
  function handleAction(e) {
    if (isPaused) return;

    if (currentState === STATE.START) {
      currentState = STATE.PLAYING;
      sounds.playSwoosh();
      bird.flap();
    } else if (currentState === STATE.PLAYING) {
      bird.flap();
    } else if (currentState === STATE.GAMEOVER) {
      // Check if clicked play again or pressed space
      if (gameOverCardY < 235) {
        restartGame();
      }
    }
  }

  function restartGame() {
    score = 0;
    frames = 0;
    pipes.reset();
    bird.reset();
    particles = [];
    scorePopups = [];
    isNewHighScore = false;
    gameOverCardY = V_HEIGHT;
    currentState = STATE.START;
    sounds.playSwoosh();
  }

  // Main Loop
  function gameLoop() {
    if (!isPaused) {
      frames++;

      // Parallax update
      if (currentState === STATE.PLAYING) {
        cloudOffset += 0.4;
        cityOffset += 0.8;
        groundOffset += pipes.speed;
      } else if (currentState === STATE.START) {
        cloudOffset += 0.2;
        cityOffset += 0.4;
        groundOffset += 1.0;
      }

      bird.update();
      pipes.update();
    }

    // Screen Shake apply
    ctx.save();
    if (screenShake > 0) {
      const sx = (Math.random() * 2 - 1) * screenShake;
      const sy = (Math.random() * 2 - 1) * screenShake;
      ctx.translate(sx, sy);
      screenShake *= 0.88;
      if (screenShake < 0.2) screenShake = 0;
    }

    const currentTheme = isNight ? THEMES.night : THEMES.day;

    // Render Scene
    drawBackground(currentTheme);
    pipes.draw(currentTheme);
    drawGround(currentTheme);
    bird.draw(currentTheme);
    updateAndDrawFX();
    drawScoreHUD();
    drawStartScreen();
    drawGameOverScreen();

    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  // Canvas scaling and High-DPI support
  function resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;

    // Calculate virtual scale maintaining aspect ratio
    const scaleX = canvas.width / V_WIDTH;
    const scaleY = canvas.height / V_HEIGHT;
    scale = Math.min(scaleX, scaleY);

    ctx.resetTransform();
    // Center virtual viewport inside canvas
    const offsetX = (canvas.width - V_WIDTH * scale) / 2;
    const offsetY = (canvas.height - V_HEIGHT * scale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleAction(e);
    } else if (e.code === 'KeyP') {
      togglePause();
    } else if (e.code === 'KeyM') {
      toggleSound();
    }
  });

  // Touch and Mouse controls on canvas
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sounds.init();
    handleAction(e);
  });

  // UI Buttons
  function toggleSound() {
    const muted = sounds.toggleMute();
    soundBtn.textContent = muted ? '🔇' : '🔊';
  }

  function toggleTheme() {
    isNight = !isNight;
    themeBtn.textContent = isNight ? '🌙' : '☀️';
    document.getElementById('game-container').style.background = isNight ? '#0f1a2e' : '#4ec0ca';
  }

  function togglePause() {
    if (currentState !== STATE.PLAYING) return;
    isPaused = !isPaused;
    if (isPaused) {
      pauseScreen.classList.remove('hidden');
    } else {
      pauseScreen.classList.add('hidden');
    }
  }

  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSound();
  });

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
  });

  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });

  resumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });

  // Start initialization
  resizeCanvas();
  requestAnimationFrame(gameLoop);
})();
