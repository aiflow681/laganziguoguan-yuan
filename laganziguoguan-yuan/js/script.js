
Array.prototype.last = function () {
  return this[this.length - 1];
};

// A sinus function that acceps degrees instead of radians
Math.sinus = function (degree) {
  return Math.sin((degree / 180) * Math.PI);
};

// Game data
let phase = "waiting"; // waiting | stretching | turning | walking | transitioning | falling
let lastTimestamp;

let heroX; // Changes when moving forward
let heroY; // Only changes when falling
let sceneOffset; // Moves the whole game

let platforms = [];
let sticks = [];
let trees = [];

// Todo: Save high score to localStorage (?)

let score = 0;

// 配置
const canvasWidth = 375;
const canvasHeight = 375;
const platformHeight = 100;
const heroDistanceFromEdge = 10; // 等待时
const paddingX = 100; // 从原始画布尺寸开始，英雄的等待位置
const perfectAreaSize = 10;

const backgroundSpeedMultiplier = 0.2;

const hill1BaseHeight = 100;
const hill1Amplitude = 10;
const hill1Stretch = 1;
const hill2BaseHeight = 70;
const hill2Amplitude = 20;
const hill2Stretch = 0.5;

const stretchingSpeed = 4; // Milliseconds it takes to draw a pixel
const turningSpeed = 4; // Milliseconds it takes to turn a degree
const walkingSpeed = 4;
const transitioningSpeed = 2;
const fallingSpeed = 2;

const heroWidth = 17; // 24
const heroHeight = 30; // 40

const canvas = document.getElementById("game");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");

const introductionElement = document.getElementById("introduction");
const perfectElement = document.getElementById("perfect");
const restartButton = document.getElementById("restart");
const scoreElement = document.getElementById("score");

// Initialize layout
resetGame();

// 重置游戏变量和布局，但不启动游戏（游戏在按键时开始）
function resetGame() {
  // 重置游戏进度
  phase = "waiting";
  lastTimestamp = undefined;
  sceneOffset = 0;
  score = 0;

  introductionElement.style.opacity = 1;
  perfectElement.style.opacity = 0;
  restartButton.style.display = "none";
  scoreElement.innerText = score;

  // 第一个平台总是相同的x+w必须匹配paddingX
  platforms = [{ x: 50, w: 50 }];
  generatePlatform();
  generatePlatform();
  generatePlatform();
  generatePlatform();

  sticks = [{ x: platforms[0].x + platforms[0].w, length: 0, rotation: 0 }];

  trees = [];
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();

  heroX = platforms[0].x + platforms[0].w - heroDistanceFromEdge;
  heroY = 0;

  draw();
}

function generateTree() {
  const minimumGap = 30;
  const maximumGap = 150;

  // 最远树右边缘的X坐标
  const lastTree = trees[trees.length - 1];
  let furthestX = lastTree ? lastTree.x : 0;

  const x =
    furthestX +
    minimumGap +
    Math.floor(Math.random() * (maximumGap - minimumGap));

  const treeColors = ["#6D8821", "#8FAC34", "#98B333"];
  const color = treeColors[Math.floor(Math.random() * 3)];

  trees.push({ x, color });
}

function generatePlatform() {
  const minimumGap = 40;
  const maximumGap = 200;
  const minimumWidth = 20;
  const maximumWidth = 100;

  // X coordinate of the right edge of the furthest platform
  const lastPlatform = platforms[platforms.length - 1];
  let furthestX = lastPlatform.x + lastPlatform.w;

  const x =
    furthestX +
    minimumGap +
    Math.floor(Math.random() * (maximumGap - minimumGap));
  const w =
    minimumWidth + Math.floor(Math.random() * (maximumWidth - minimumWidth));

  platforms.push({ x, w });
}

resetGame();

// 如果按下空格键，则重新启动游戏
window.addEventListener("keydown", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    resetGame();
    return;
  }
});

window.addEventListener("mousedown", function (event) {
  if (phase == "waiting") {
    lastTimestamp = undefined;
    introductionElement.style.opacity = 0;
    phase = "stretching";
    window.requestAnimationFrame(animate);
  }
});

window.addEventListener("mouseup", function (event) {
  if (phase == "stretching") {
    phase = "turning";
  }
});

window.addEventListener("resize", function (event) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
});

window.requestAnimationFrame(animate);

// The main game loop
function animate(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    window.requestAnimationFrame(animate);
    return;
  }

  switch (phase) {
    case "waiting":
      return; // Stop the loop
    case "stretching": {
      sticks.last().length += (timestamp - lastTimestamp) / stretchingSpeed;
      break;
    }
    case "turning": {
      sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

      if (sticks.last().rotation > 90) {
        sticks.last().rotation = 90;

        const [nextPlatform, perfectHit] = thePlatformTheStickHits();
        if (nextPlatform) {
          // Increase score
          score += perfectHit ? 2 : 1;
          scoreElement.innerText = score;

          if (perfectHit) {
            perfectElement.style.opacity = 1;
            setTimeout(() => (perfectElement.style.opacity = 0), 1000);
          }

          generatePlatform();
          generateTree();
          generateTree();
        }

        phase = "walking";
      }
      break;
    }
    case "walking": {
      heroX += (timestamp - lastTimestamp) / walkingSpeed;

      const [nextPlatform] = thePlatformTheStickHits();
      if (nextPlatform) {
        // If hero will reach another platform then limit it's position at it's edge
        const maxHeroX = nextPlatform.x + nextPlatform.w - heroDistanceFromEdge;
        if (heroX > maxHeroX) {
          heroX = maxHeroX;
          phase = "transitioning";
        }
      } else {
        // If hero won't reach another platform then limit it's position at the end of the pole
        const maxHeroX = sticks.last().x + sticks.last().length + heroWidth;
        if (heroX > maxHeroX) {
          heroX = maxHeroX;
          phase = "falling";
        }
      }
      break;
    }
    case "transitioning": {
      sceneOffset += (timestamp - lastTimestamp) / transitioningSpeed;

      const [nextPlatform] = thePlatformTheStickHits();
      if (sceneOffset > nextPlatform.x + nextPlatform.w - paddingX) {
        // Add the next step
        sticks.push({
          x: nextPlatform.x + nextPlatform.w,
          length: 0,
          rotation: 0
        });
        phase = "waiting";
      }
      break;
    }
    case "falling": {
      if (sticks.last().rotation < 180)
        sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

      heroY += (timestamp - lastTimestamp) / fallingSpeed;
      const maxHeroY =
        platformHeight + 100 + (window.innerHeight - canvasHeight) / 2;
      if (heroY > maxHeroY) {
        restartButton.style.display = "block";
        return;
      }
      break;
    }
    default:
      throw Error("Wrong phase");
  }

  draw();
  window.requestAnimationFrame(animate);

  lastTimestamp = timestamp;
}

// 返回棍子击中的平台（如果没有击中任何棍子，则返回未定义）
function thePlatformTheStickHits() {
  if (sticks.last().rotation != 90)
    throw Error(`Stick is ${sticks.last().rotation}°`);
  const stickFarX = sticks.last().x + sticks.last().length;

  const platformTheStickHits = platforms.find(
    (platform) => platform.x < stickFarX && stickFarX < platform.x + platform.w
  );

  // 如果棍子击中完美区域
  if (
    platformTheStickHits &&
    platformTheStickHits.x + platformTheStickHits.w / 2 - perfectAreaSize / 2 <
      stickFarX &&
    stickFarX <
      platformTheStickHits.x + platformTheStickHits.w / 2 + perfectAreaSize / 2
  )
    return [platformTheStickHits, true];

  return [platformTheStickHits, false];
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawBackground();

  // 将主画布区域居中到屏幕中间
  ctx.translate(
    (window.innerWidth - canvasWidth) / 2 - sceneOffset,
    (window.innerHeight - canvasHeight) / 2
  );

  // 绘制场景
  drawPlatforms();
  drawHero();
  drawSticks();

  // 恢复转换
  ctx.restore();
}

restartButton.addEventListener("click", function (event) {
  event.preventDefault();
  resetGame();
  restartButton.style.display = "none";
});

function drawPlatforms() {
  platforms.forEach(({ x, w }) => {
    // Draw platform
    ctx.fillStyle = "black";
    ctx.fillRect(
      x,
      canvasHeight - platformHeight,
      w,
      platformHeight + (window.innerHeight - canvasHeight) / 2
    );

    // Draw perfect area only if hero did not yet reach the platform
    if (sticks.last().x < x) {
      ctx.fillStyle = "red";
      ctx.fillRect(
        x + w / 2 - perfectAreaSize / 2,
        canvasHeight - platformHeight,
        perfectAreaSize,
        perfectAreaSize
      );
    }
  });
}

function drawHero() {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.translate(
    heroX - heroWidth / 2,
    heroY + canvasHeight - platformHeight - heroHeight / 2
  );

  // Body
  drawRoundedRect(
    -heroWidth / 2,
    -heroHeight / 2,
    heroWidth,
    heroHeight - 4,
    5
  );

  // Legs
  const legDistance = 5;
  ctx.beginPath();
  ctx.arc(legDistance, 11.5, 3, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-legDistance, 11.5, 3, 0, Math.PI * 2, false);
  ctx.fill();

  // Eye
  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(5, -7, 3, 0, Math.PI * 2, false);
  ctx.fill();

  // Band
  ctx.fillStyle = "red";
  ctx.fillRect(-heroWidth / 2 - 1, -12, heroWidth + 2, 4.5);
  ctx.beginPath();
  ctx.moveTo(-9, -14.5);
  ctx.lineTo(-17, -18.5);
  ctx.lineTo(-14, -8.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, -10.5);
  ctx.lineTo(-15, -3.5);
  ctx.lineTo(-5, -7);
  ctx.fill();

  ctx.restore();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

function drawSticks() {
  sticks.forEach((stick) => {
    ctx.save();

    // Move the anchor point to the start of the stick and rotate
    ctx.translate(stick.x, canvasHeight - platformHeight);
    ctx.rotate((Math.PI / 180) * stick.rotation);

    // Draw stick
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -stick.length);
    ctx.stroke();

    // Restore transformations
    ctx.restore();
  });
}

function drawBackground() {
  // Draw sky
  var gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#BBD691");
  gradient.addColorStop(1, "#FEF1E1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // Draw hills
  drawHill(hill1BaseHeight, hill1Amplitude, hill1Stretch, "#95C629");
  drawHill(hill2BaseHeight, hill2Amplitude, hill2Stretch, "#659F1C");

  // Draw trees
  trees.forEach((tree) => drawTree(tree.x, tree.color));
}

// 山丘是伸展的正弦波下的形状
function drawHill(baseHeight, amplitude, stretch, color) {
  ctx.beginPath();
  ctx.moveTo(0, window.innerHeight);
  ctx.lineTo(0, getHillY(0, baseHeight, amplitude, stretch));
  for (let i = 0; i < window.innerWidth; i++) {
    ctx.lineTo(i, getHillY(i, baseHeight, amplitude, stretch));
  }
  ctx.lineTo(window.innerWidth, window.innerHeight);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawTree(x, color) {
  ctx.save();
  ctx.translate(
    (-sceneOffset * backgroundSpeedMultiplier + x) * hill1Stretch,
    getTreeY(x, hill1BaseHeight, hill1Amplitude)
  );

  const treeTrunkHeight = 5;
  const treeTrunkWidth = 2;
  const treeCrownHeight = 25;
  const treeCrownWidth = 10;

  // Draw trunk
  ctx.fillStyle = "#7D833C";
  ctx.fillRect(
    -treeTrunkWidth / 2,
    -treeTrunkHeight,
    treeTrunkWidth,
    treeTrunkHeight
  );

  // Draw crown
  ctx.beginPath();
  ctx.moveTo(-treeCrownWidth / 2, -treeTrunkHeight);
  ctx.lineTo(0, -(treeTrunkHeight + treeCrownHeight));
  ctx.lineTo(treeCrownWidth / 2, -treeTrunkHeight);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

function getHillY(windowX, baseHeight, amplitude, stretch) {
  const sineBaseY = window.innerHeight - baseHeight;
  return (
    Math.sinus((sceneOffset * backgroundSpeedMultiplier + windowX) * stretch) *
      amplitude +
    sineBaseY
  );
}

// 阻止页面滚动和缩放
document.addEventListener('touchmove', function(event) {
    // 允许游戏画布和按钮的触摸事件
    if (event.target.closest('#game') || event.target.closest('#restart')) {
        return;
    }
    event.preventDefault();
}, { passive: false });

// 阻止手势操作
document.addEventListener('gesturestart', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gesturechange', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gestureend', function(event) {
    event.preventDefault();
}, { passive: false });

// 阻止右键菜单和长按菜单
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    return false;
});

// 阻止双击缩放
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// 阻止长按操作
let touchStartTime = 0;
let touchMoved = false;
let touchStartX = 0;
let touchStartY = 0;

// 记录触摸开始
document.addEventListener('touchstart', function(event) {
    touchMoved = false;
    touchStartTime = Date.now();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    
    // 清除任何现有的文本选择
    if (window.getSelection) {
        var selection = window.getSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
    }
}, { passive: true });

// 记录触摸移动
document.addEventListener('touchmove', function(event) {
    if (Math.abs(event.touches[0].clientX - touchStartX) > 10 || 
        Math.abs(event.touches[0].clientY - touchStartY) > 10) {
        touchMoved = true;
    }
}, { passive: true });

// 阻止长按菜单
document.addEventListener('touchend', function(event) {
    const touchDuration = Date.now() - touchStartTime;
    
    // 如果是长按（超过500ms）并且没有移动，阻止默认行为
    if (touchDuration > 500 && !touchMoved) {
        event.preventDefault();
    }
    
    // 清除任何文本选择
    if (window.getSelection) {
        var selection = window.getSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
    }
}, { passive: false });

// 额外防护措施
// 1. 阻止文本选择
document.addEventListener('selectstart', function(event) {
    event.preventDefault();
    return false;
}, { passive: false });

// 2. 阻止剪贴板事件
document.addEventListener('copy', function(event) {
    event.preventDefault();
    return false;
}, { passive: false });

document.addEventListener('cut', function(event) {
    event.preventDefault();
    return false;
}, { passive: false });

document.addEventListener('paste', function(event) {
    event.preventDefault();
    return false;
}, { passive: false });

// 3. 阻止选择更改
document.addEventListener('selectionchange', function(event) {
    if (window.getSelection) {
        var selection = window.getSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
    }
}, { passive: true });

// 4. 阻止长按菜单（Android专用）
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    return false;
}, { passive: false });

// 5. 监听并阻止selectionchange事件（Chrome专用）
if (window.getSelection) {
    var originalGetSelection = window.getSelection;
    window.getSelection = function() {
        var selection = originalGetSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
        return selection;
    };
}

// 在文档加载完成后立即清除所有选择
window.addEventListener('load', function() {
    if (window.getSelection) {
        var selection = window.getSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
    }
    
    // 进一步防止长按复制 - 最直接的方法
    document.onselectstart = function(e) {
        e.preventDefault();
        return false;
    };
    
    // 防止复制
    document.oncopy = function(e) {
        e.preventDefault();
        return false;
    };
    
    // 防止剪切
    document.oncut = function(e) {
        e.preventDefault();
        return false;
    };
    
    // 防止粘贴
    document.onpaste = function(e) {
        e.preventDefault();
        return false;
    };
    
    // 防止右键菜单
    document.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    };
    
    // 为所有元素添加这些事件处理
    var allElements = document.getElementsByTagName('*');
    for (var i = 0; i < allElements.length; i++) {
        allElements[i].onselectstart = function(e) {
            e.preventDefault();
            return false;
        };
        
        allElements[i].oncopy = function(e) {
            e.preventDefault();
            return false;
        };
        
        allElements[i].oncut = function(e) {
            e.preventDefault();
            return false;
        };
        
        allElements[i].onpaste = function(e) {
            e.preventDefault();
            return false;
        };
        
        allElements[i].oncontextmenu = function(e) {
            e.preventDefault();
            return false;
        };
    }
}, { passive: true });

// 为点击长按按钮添加事件
document.addEventListener('DOMContentLoaded', function() {
  const holdButton = document.getElementById('hold-button');
  const restartButton = document.getElementById('restart');
  
  if (holdButton) {
    // 触摸开始事件
    holdButton.addEventListener('touchstart', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的按下事件
      triggerMouseEvent('mousedown');
      holdButton.classList.add('active');
    });
    
    // 触摸结束事件
    holdButton.addEventListener('touchend', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的抬起事件
      triggerMouseEvent('mouseup');
      holdButton.classList.remove('active');
    });
    
    // 触摸取消事件
    holdButton.addEventListener('touchcancel', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的抬起事件
      triggerMouseEvent('mouseup');
      holdButton.classList.remove('active');
    });
    
    // 防止拖动
    holdButton.addEventListener('touchmove', function(e) {
      e.preventDefault();
    });
    
    // 鼠标事件（用于调试）
    holdButton.addEventListener('mousedown', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的按下事件
      triggerMouseEvent('mousedown');
      holdButton.classList.add('active');
    });
    
    holdButton.addEventListener('mouseup', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的抬起事件
      triggerMouseEvent('mouseup');
      holdButton.classList.remove('active');
    });
    
    holdButton.addEventListener('mouseleave', function(e) {
      e.preventDefault();
      
      // 始终模拟游戏中的抬起事件
      triggerMouseEvent('mouseup');
      holdButton.classList.remove('active');
    });
  }
});

// 触发鼠标事件的函数
function triggerMouseEvent(eventType) {
  const canvas = document.getElementById('game');
  if (canvas) {
    const mouseEvent = new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true
    });
    canvas.dispatchEvent(mouseEvent);
  }
}

// 重新开始游戏函数
function restartGame() {
  // 直接调用resetGame函数，而不是通过点击按钮
  resetGame();
  
  // 隐藏hold-button并显示原来的重新开始按钮
  const holdButton = document.getElementById('hold-button');
  if (holdButton) {
    holdButton.style.display = 'none';
  }
  
  const restartButton = document.getElementById('restart');
  if (restartButton) {
    restartButton.style.display = 'block';
  }
  
  // 恢复按钮状态
  setTimeout(() => {
    const holdButton = document.getElementById('hold-button');
    if (holdButton) {
      holdButton.textContent = '按住';
      holdButton.classList.remove('restart');
      holdButton.style.display = 'block';
    }
  }, 500); // 延迟500毫秒再显示按钮，给重新开始按钮时间消失
}

// 监听游戏状态变化，修改按钮状态
document.addEventListener('keydown', function(e) {
  updateHoldButton();
});

document.addEventListener('mousedown', function(e) {
  updateHoldButton();
});

window.addEventListener('resize', function() {
  updateHoldButton();
});

// 监听游戏循环，判断是否进入死亡状态
(function() {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = function(callback) {
    return originalRequestAnimationFrame(function(timestamp) {
      const result = callback(timestamp);
      
      // 检查游戏状态
      if (typeof phase !== 'undefined') {
        updateHoldButton();
      }
      
      return result;
    });
  };
})();

// 更新按钮状态和文字
function updateHoldButton() {
  const holdButton = document.getElementById('hold-button');
  if (holdButton) {
    // 始终保持"按住"状态，不受游戏状态影响
    holdButton.textContent = '按住';
    holdButton.classList.remove('restart');
    
    // 显示原来的重新开始按钮（如果游戏结束了但玩家点击了重新开始）
    const restartButton = document.getElementById('restart');
    if (restartButton && restartButton.style.display === 'none' && phase === 'waiting') {
      restartButton.style.display = 'block';
    }
  }
}

// 设置定时器，定期清除选择
setInterval(function() {
    if (window.getSelection) {
        var selection = window.getSelection();
        if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
        }
    }
}, 100);

function getTreeY(x, baseHeight, amplitude) {
  const sineBaseY = window.innerHeight - baseHeight;
  return Math.sinus(x) * amplitude + sineBaseY;
}