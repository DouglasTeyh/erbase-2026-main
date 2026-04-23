document.addEventListener('DOMContentLoaded', async function () {

    await Promise.all([
        loadComponent('navbar-container', 'components/navbar.html'),
        loadComponent('footer-container', 'components/footer.html')
    ]);

    initHamburgerMenu();

    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'home';

    await loadInitialPage(initialPage);

    initSectionNavigation();
    initPageNavigation();
    initNavbarScroll();
    initScheduleTabs();
});

function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

async function loadComponent(containerId, url) {
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.text();
            document.getElementById(containerId).innerHTML = data;
        }
    } catch (error) {
        console.error(`Erro ao carregar ${url}:`, error);
    }
}

async function loadInitialPage(page) {
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.getAll().forEach(st => st.kill());
    }

    const contentDiv = document.getElementById('app-content');
    contentDiv.style.transition = 'opacity 0.3s ease-in-out';
    contentDiv.style.opacity = '0';

    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer-container');
    const navElem = document.querySelector('.navbar');

    if (page === 'desenvolvedor') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
    } else {
        if (navbar) navbar.style.display = '';
        if (footer) footer.style.display = '';
        if (navElem && typeof gsap !== 'undefined') {
            gsap.killTweensOf(navElem);
            gsap.set(navElem, { yPercent: 0, autoAlpha: 1 });
        }
    }

    try {
        let fetchPage = page;
        window.currentLoadedPage = fetchPage;

        const response = await fetch(`pages/${fetchPage}.html?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Página não encontrada');
        const html = await response.text();

        await new Promise(resolve => setTimeout(resolve, 300));

        contentDiv.innerHTML = html;

        contentDiv.style.opacity = '1';

        initHorizontalCarousel();
        initScheduleTabs();

        if (page === 'home' || page === '') {
            await loadAndRenderSchedule();
            await loadAndRenderSpeakersCarousel();
        } else if (page === 'admin') {
            initAdminPanel();
        }

        initCoolAnimations();
        initMaragogiBubbles();
        initDeveloperBubble();

        if (page === 'desenvolvedor') {
            initEpicDeveloperAnimations();
        }

    } catch (error) {
        if (navbar) navbar.style.display = '';
        if (footer) footer.style.display = '';
        
        contentDiv.innerHTML = `<div style="text-align:center; padding: 50px; min-height: 50vh; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="font-size: 3rem; color: #00A2D5;">Erro 404</h1>
            <p style="font-size: 1.2rem; color: #555;">Página não encontrada.</p>
            <a href="?page=home" style="margin-top: 20px; color: #00A2D5; text-decoration: none; font-weight: bold;">Voltar para a Home</a>
        </div>`;
        contentDiv.style.opacity = '1';
        console.error('Erro ao carregar página:', error);
    }
}

async function loadAndRenderSpeakersCarousel() {
    const track = document.getElementById('speakers-track-container');
    if (!track) return;

    try {

        const response = await fetch('assets/data/speakers.json', { cache: 'no-store' });
        if (!response.ok) throw new Error("Falha ao carregar API de speakers");
        const speakers = await response.json();

        track.innerHTML = '';

        if (speakers.length === 0) {
            track.innerHTML = '<p style="color: #fff; padding: 20px;">Nenhum palestrante cadastrado no momento.</p>';
            return;
        }

        speakers.forEach(spk => {
            const card = document.createElement('div');
            card.className = 'speaker-card';
            card.innerHTML = `
                <div class="speaker-card-inner">
                    <div class="speaker-card-front">
                        <img src="${spk.imagem}" alt="${spk.nome}" class="speaker-img">
                        <div class="speaker-info">
                            <h4 class="speaker-name">${spk.nome}</h4>
                            <p class="speaker-role">${spk.ocupacao}</p>
                            <p class="speaker-short-desc">${spk.breve_descricao}</p>
                            <button class="speaker-action-btn flip-btn">SOBRE APRESENTAÇÃO <i class="fa-solid fa-rotate"></i></button>
                        </div>
                    </div>
                    <div class="speaker-card-back">
                        <div class="speaker-info" style="justify-content: center;">
                            <h4 class="speaker-name" style="color: white; margin-bottom: 20px;">TEMA DA APRESENTAÇÃO</h4>
                            <p class="speaker-short-desc" style="color: white; font-size: 1.1rem; line-height: 1.6;">${spk.tema || spk.breve_descricao}</p>
                            <button class="speaker-action-btn flip-btn" style="color: #00A2D5; background: white; border-color: white; margin-top: 30px;"><i class="fa-solid fa-arrow-left"></i> VOLTAR</button>
                        </div>
                    </div>
                </div>
            `;

            track.appendChild(card);
        });

        initSpeakerCarouselJS();

    } catch (err) {
        console.error("Erro ao renderizar palestrantes:", err);
    }
}

function initSpeakerCarouselJS() {
    const wrapper = document.querySelector('.speakers-carousel-wrapper');
    const track = document.querySelector('.speakers-track');
    if (!wrapper || !track) return;

    const originalCards = Array.from(track.children);
    if (originalCards.length === 0) return;

    originalCards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });

    // Delegated click listener for flipping
    let flipTimeouts = new Map();

    track.addEventListener('click', (e) => {
        const card = e.target.closest('.speaker-card');
        if (!card) return;

        // Skip flip if dragging just occurred
        if (window.speakerCarouselWasDragging) {
            window.speakerCarouselWasDragging = false;
            return;
        }

        const isFlipped = card.classList.toggle('flipped');

        if (isFlipped) {
            window.speakerCarouselIsFlipped = true;
            
            // Auto-flip back after 5s
            const timeout = setTimeout(() => {
                card.classList.remove('flipped');
                if (document.querySelectorAll('.speaker-card.flipped').length === 0) {
                    window.speakerCarouselIsFlipped = false;
                }
                flipTimeouts.delete(card);
            }, 5000);
            
            flipTimeouts.set(card, timeout);
        } else {
            const timeout = flipTimeouts.get(card);
            if (timeout) {
                clearTimeout(timeout);
                flipTimeouts.delete(card);
            }
            if (document.querySelectorAll('.speaker-card.flipped').length === 0) {
                window.speakerCarouselIsFlipped = false;
            }
        }
    });

    let isScrolling = true;
    let resumeTimeout;
    let animationFrameId;

    function scroll() {
        if (isScrolling && !window.speakerCarouselIsFlipped) {
            wrapper.scrollLeft += 1;

            if (wrapper.scrollLeft >= track.scrollWidth / 2) {
                wrapper.scrollLeft -= track.scrollWidth / 2;
            } else if (wrapper.scrollLeft <= 0) {

                wrapper.scrollLeft += track.scrollWidth / 2;
            }
        } else {

            if (wrapper.scrollLeft >= track.scrollWidth / 2) {
                wrapper.scrollLeft -= track.scrollWidth / 2;
            } else if (wrapper.scrollLeft <= 0) {
                wrapper.scrollLeft += track.scrollWidth / 2;
            }
        }
        animationFrameId = requestAnimationFrame(scroll);
    }

    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(scroll);

    const pauseScroll = () => {
        isScrolling = false;
        clearTimeout(resumeTimeout);
    };

    const resumeScroll = () => {
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
            isScrolling = true;
        }, 2000);
    };

    wrapper.addEventListener('touchstart', pauseScroll, { passive: true });
    wrapper.addEventListener('touchend', resumeScroll);



    let isDown = false;
    let startX;
    let scrollLeft;

    wrapper.addEventListener('mousedown', (e) => {
        isDown = true;
        wrapper.classList.add('dragging');
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        pauseScroll();
        window.speakerCarouselWasDragging = false;
    });

    wrapper.addEventListener('mouseup', () => {
        isDown = false;
        wrapper.classList.remove('dragging');
        resumeScroll();
    });

    wrapper.addEventListener('mouseleave', () => {
        if (isDown) {
            isDown = false;
            wrapper.classList.remove('dragging');
            resumeScroll();
        }
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX) * 2;

        if (Math.abs(x - startX) > 5) {
            window.speakerCarouselWasDragging = true;
        }

        wrapper.scrollLeft = scrollLeft - walk;
    });
}

async function loadAndRenderSchedule() {
    const colMap = {
        "EVENTO PRINCIPAL": 2,
        "PesqBase": 3,
        "WeiBase": 4,
        "RoboBase": 5,
        "XBase": 6,
        "ProgBase": 7,
        "Meninas DigiBase": 8,
        "BREAK": "2 / span 7"
    };

    const colorMap = {
        "EVENTO PRINCIPAL": "event-blue",
        "PesqBase": "event-yellow",
        "WeiBase": "event-teal",
        "RoboBase": "event-red",
        "XBase": "event-pink",
        "ProgBase": "event-green",
        "Meninas DigiBase": "event-purple",
        "BREAK": "event-break"
    };

    function timeToMins(t) {
        if (!t) return 0;
        let [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    try {
        const response = await fetch('assets/data/programacao-evento.json', { cache: 'no-store' });
        if (!response.ok) throw new Error("Failed to load API schedule data");
        const rawEvents = await response.json();

        let events = [];
        let breaks = rawEvents.filter(e => e.nome_evento === 'BREAK');

        rawEvents.forEach(ev => {
            if (ev.nome_evento === 'BREAK') {
                events.push(ev);
                return;
            }

            let evStart = timeToMins(ev.hora_inicio);
            let evEnd = timeToMins(ev.hora_fim);

            let overlappingBreaks = breaks.filter(b =>
                b.dia_evento === ev.dia_evento &&
                timeToMins(b.hora_inicio) > evStart &&
                timeToMins(b.hora_fim) < evEnd
            );

            if (overlappingBreaks.length > 0) {
                overlappingBreaks.sort((a, b) => timeToMins(a.hora_inicio) - timeToMins(b.hora_inicio));

                let currentStart = ev.hora_inicio;
                for (let b of overlappingBreaks) {
                    events.push({
                        ...ev,
                        hora_inicio: currentStart,
                        hora_fim: b.hora_inicio
                    });
                    currentStart = b.hora_fim;
                }
                events.push({
                    ...ev,
                    hora_inicio: currentStart,
                    hora_fim: ev.hora_fim
                });
            } else {
                events.push(ev);
            }
        });

        let eventsByDayCol = {};
        events.forEach(ev => {
            if (ev.nome_evento === 'BREAK') return;
            let key = `${ev.dia_evento}-${ev.nome_evento}`;
            if (!eventsByDayCol[key]) eventsByDayCol[key] = [];
            eventsByDayCol[key].push(ev);
        });

        Object.values(eventsByDayCol).forEach(colEvents => {
            let clusters = [];
            let currentCluster = [];
            let currentMaxEnd = 0;

            colEvents.sort((a, b) => timeToMins(a.hora_inicio) - timeToMins(b.hora_inicio));

            colEvents.forEach(ev => {
                let start = timeToMins(ev.hora_inicio);
                let end = timeToMins(ev.hora_fim);

                if (currentCluster.length === 0) {
                    currentCluster.push(ev);
                    currentMaxEnd = end;
                } else if (start < currentMaxEnd) {
                    currentCluster.push(ev);
                    currentMaxEnd = Math.max(currentMaxEnd, end);
                } else {
                    clusters.push(currentCluster);
                    currentCluster = [ev];
                    currentMaxEnd = end;
                }
            });
            if (currentCluster.length > 0) {
                clusters.push(currentCluster);
            }

            clusters.forEach(cluster => {
                let columns = [];
                cluster.forEach(ev => {
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                        let lastEvent = columns[i][columns[i].length - 1];
                        if (timeToMins(lastEvent.hora_fim) <= timeToMins(ev.hora_inicio)) {
                            columns[i].push(ev);
                            ev._colIndex = i;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        columns.push([ev]);
                        ev._colIndex = columns.length - 1;
                    }
                });
                cluster.forEach(ev => {
                    ev._totalCols = columns.length;
                });
            });
        });

        document.querySelectorAll('.schedule-grid').forEach(grid => {

            Array.from(grid.children).forEach(child => {
                if (!child.classList.contains('grid-header') && !child.classList.contains('time-slot')) {
                    child.remove();
                }
            });
        });

        events.forEach(ev => {
            const dayGrid = document.getElementById(`day-${ev.dia_evento}`);
            if (!dayGrid) return;

            const startRow = `time-${(ev.hora_inicio || '').replace(':', '')}`;
            const endRow = `time-${(ev.hora_fim || '').replace(':', '')}`;

            const col = colMap[ev.nome_evento] || 2;
            const colorClass = colorMap[ev.nome_evento] || "event-blue";

            const el = document.createElement('div');
            el.className = `schedule-event ${colorClass}`;
            el.style.gridColumn = col;
            el.style.gridRow = `${startRow} / ${endRow}`;

            if (ev.nome_evento === 'BREAK') {
                el.innerHTML = `<h3 class="event-title">${ev.titulo_curto}</h3>`;
                if (ev.descricao && ev.descricao.trim().length > 0) {
                    el.innerHTML += `<div class="event-details-hint"><i class="fa-solid fa-circle-plus"></i></div>`;
                    el.setAttribute('data-tooltip', 'CLIQUE PARA VER CONTEÚDO DO EVENTO');
                    el.style.cursor = 'pointer';
                    el.setAttribute('tabindex', '0');
                    el.addEventListener('click', () => showScheduleModal(ev));
                }
            } else {
                el.innerHTML = `
                    <p class="event-time">${ev.hora_inicio} - ${ev.hora_fim}</p>
                    <h3 class="event-title">${ev.titulo_curto}</h3>
                    <p class="event-speaker">${ev.nome_evento}</p>
                `;
                if (ev.descricao && ev.descricao.trim().length > 0) {
                    el.innerHTML += `<div class="event-details-hint"><i class="fa-solid fa-circle-plus"></i></div>`;
                    el.setAttribute('data-tooltip', 'CLIQUE PARA VER CONTEÚDO DO EVENTO');
                    el.style.cursor = 'pointer';
                    el.setAttribute('tabindex', '0');
                    el.addEventListener('click', () => showScheduleModal(ev));
                }

                if (ev._totalCols > 1) {
                    el.style.width = `calc(${100 / ev._totalCols}% - 6px)`;
                    el.style.justifySelf = 'start';
                    el.style.left = `calc(${ev._colIndex * (100 / ev._totalCols)}%)`;
                }
            }

            dayGrid.appendChild(el);
        });
    } catch (err) {
        console.error("Erro ao renderizar a programação:", err);
    }
}

function initAdminPanel() {
    const adminContainer = document.getElementById('admin-container');
    const loginOverlay = document.getElementById('admin-login-overlay');

    if (localStorage.getItem('erbase_admin_logged') !== 'true') {
        loginOverlay.style.display = 'flex';
        adminContainer.style.display = 'none';

        const loginBtn = document.getElementById('admin-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const user = document.getElementById('admin-user').value;
                const pass = document.getElementById('admin-pass').value;

                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user, pass })
                    });
                    if (res.ok) {
                        localStorage.setItem('erbase_admin_logged', 'true');
                        loginOverlay.style.display = 'none';
                        adminContainer.style.display = 'block';
                        loadAdminData();
                    } else {
                        alert('Credenciais incorretas!');
                    }
                } catch (e) {
                    alert('Erro de conexão com o servidor da API.');
                }
            });
        }
    } else {
        loginOverlay.style.display = 'none';
        adminContainer.style.display = 'block';
        loadAdminData();
    }

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('erbase_admin_logged');
            window.location.reload();
        });
    }
}

async function loadAdminData() {
    try {
        const [progRes, speakRes] = await Promise.all([
            fetch('/api/schedule', { cache: 'no-store' }),
            fetch('/api/speakers', { cache: 'no-store' })
        ]);

        window.adminData = {
            programacao: await progRes.json(),
            speakers: await speakRes.json()
        };

        renderAdminLists();
    } catch (e) {
        console.error("Erro ao carregar dados do Admin", e);
    }
}

function renderAdminLists() {

    const progList = document.getElementById('admin-prog-list');
    if (progList) {
        progList.innerHTML = '';
        window.adminData.programacao.forEach((ev, i) => {
            const li = document.createElement('li');

            let actionButtons = `
                <button onclick="window.deleteEvent(${i})" class="btn-del">Remover</button>
            `;
            if (ev.nome_evento !== 'BREAK') {
                actionButtons = `<button onclick="window.editEvent(${i})" class="btn-edit">Editar</button>` + actionButtons;
            }

            li.innerHTML = `<strong>Dia ${ev.dia_evento} | ${ev.hora_inicio} - ${ev.hora_fim}</strong>: ${ev.titulo_curto} <span style="color:#00A2D5; font-size:0.85rem;">[${ev.nome_evento}]</span>
            <div style="min-width: 150px; text-align:right;">${actionButtons}</div>`;
            progList.appendChild(li);
        });
    }

    const speakList = document.getElementById('admin-speak-list');
    if (speakList) {
        speakList.innerHTML = '';
        window.adminData.speakers.forEach((spk, i) => {
            const li = document.createElement('li');
            li.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="width:40px; height:40px; border-radius:50%; background:url('${spk.imagem}') center/cover; border:2px solid #00A2D5;"></div>
                <div>
                    <strong>${spk.nome}</strong> <br>
                    <span style="font-size:0.85rem; color:#666;">${spk.ocupacao}</span>
                </div>
            </div>
            <div style="min-width: 150px; text-align:right;">
                <button onclick="window.editSpeaker(${i})" class="btn-edit">Editar</button>
                <button onclick="window.deleteSpeaker(${i})" class="btn-del">Remover</button>
            </div>`;
            speakList.appendChild(li);
        });
    }
}

window.deleteEvent = async function (index) {
    if (confirm('Remover evento?')) {
        window.adminData.programacao.splice(index, 1);
        renderAdminLists();

        try {
            await fetch('/api/schedule/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.adminData.programacao)
            });
        } catch (e) { console.error("Error auto-syncing", e); }
    }
}

window.deleteSpeaker = async function (index) {
    if (confirm('Tem certeza? O HTML estático do palestrante será DELETADO do servidor.')) {
        window.adminData.speakers.splice(index, 1);
        renderAdminLists();

        try {
            await fetch('/api/speakers/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.adminData.speakers)
            });
        } catch (e) { console.error("Error auto-syncing", e); }
    }
}

window.switchAdminTab = function (tab) {
    document.querySelectorAll('#admin-container .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    document.getElementById('admin-tab-prog').style.display = tab === 'prog' ? 'block' : 'none';
    document.getElementById('admin-tab-speak').style.display = tab === 'speak' ? 'block' : 'none';
}

window.editEvent = function (index) {
    window.currentEditingType = 'prog';
    window.currentEditingIndex = index;
    const ev = index >= 0 ? window.adminData.programacao[index] : { dia_evento: 23, titulo_curto: '', nome_evento: 'EVENTO PRINCIPAL', hora_inicio: '', hora_fim: '', descricao: '' };

    document.getElementById('modal-title').textContent = index >= 0 ? 'Editar Evento' : 'Novo Evento';

    const dias = [23, 24, 25];
    const trilhas = ['EVENTO PRINCIPAL', 'PesqBase', 'WeiBase', 'RoboBase', 'XBase', 'ProgBase', 'Meninas DigiBase', 'BREAK'];

    document.getElementById('modal-form-container').innerHTML = `
        <div class="admin-form-grid">
            <div>
                <label class="admin-label">Dia do Evento</label>
                <select id="ev-dia" class="admin-input custom-select">
                    ${dias.map(d => `<option value="${d}" ${ev.dia_evento == d ? 'selected' : ''}>${d} de Setembro</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="admin-label">Trilha (Coluna da Tabela)</label>
                <select id="ev-nome" class="admin-input custom-select">
                    ${trilhas.map(t => `<option value="${t}" ${ev.nome_evento == t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div style="grid-column: span 2;">
                <label class="admin-label">Título Curto</label>
                <input type="text" id="ev-titulo" class="admin-input" value="${ev.titulo_curto}" placeholder="Ex: Palestra Magna">
            </div>
            <div>
                <label class="admin-label">Início (HH:MM)</label>
                <input type="time" id="ev-inicio" class="admin-input" value="${ev.hora_inicio}">
            </div>
            <div>
                <label class="admin-label">Fim (HH:MM)</label>
                <input type="time" id="ev-fim" class="admin-input" value="${ev.hora_fim}">
            </div>
            <div style="grid-column: span 2;">
                <label class="admin-label">Descrição (Exibida no Card/Mobile)</label>
                <textarea id="ev-desc" class="admin-input" rows="3" placeholder="Uma breve descrição sobre o que acontecerá...">${ev.descricao || ''}</textarea>
            </div>
        </div>
    `;
    document.getElementById('admin-modal').style.display = 'flex';
}

window.editSpeaker = function (index) {
    window.currentEditingType = 'speak';
    window.currentEditingIndex = index;
    const spk = index >= 0 ? window.adminData.speakers[index] : { id: '', nome: '', ocupacao: '', breve_descricao: '', biografia: '', imagem: '', links: {} };
    const links = spk.links || {};

    document.getElementById('modal-title').textContent = index >= 0 ? 'Editar Palestrante' : 'Novo Palestrante';
    document.getElementById('modal-form-container').innerHTML = `
        <div class="admin-form-grid">
            <div>
                <label class="admin-label">ID Único (Nome sem espaços, ex: joao-silva)</label>
                <input type="text" id="sp-id" class="admin-input" value="${spk.id}" placeholder="Ex: joao-silva">
                <small style="color: #888; margin-top:-10px; margin-bottom:15px; display:block;">Isto gerará um arquivo com este nome na pasta pages/speakers/.</small>
            </div>
            <div>
                <label class="admin-label">Nome Completo</label>
                <input type="text" id="sp-nome" class="admin-input" value="${spk.nome}">
            </div>
            <div style="grid-column: span 2;">
                <label class="admin-label">Ocupação / Cargo</label>
                <input type="text" id="sp-ocupacao" class="admin-input" value="${spk.ocupacao}">
            </div>
            <div style="grid-column: span 2;">
                <label class="admin-label">Breve Descrição (Aparece no Carrossel Inicial)</label>
                <input type="text" id="sp-breve" class="admin-input" value="${spk.breve_descricao}" maxlength="150">
            </div>

            <div style="grid-column: span 2;">
                <label class="admin-label">Imagem de Perfil (Upload)</label>
                <div style="display:flex; gap:15px; align-items:center; margin-bottom: 15px;">
                    <div id="sp-img-preview" style="width:60px; height:60px; border-radius:50%; background:url('${spk.imagem || 'https://via.placeholder.com/60'}') center/cover; border:2px solid #ccc;"></div>
                    <input type="file" id="sp-img-file" class="admin-input" style="margin-bottom:0;" accept="image/*">
                    <input type="hidden" id="sp-img-url" value="${spk.imagem || ''}">
                </div>
            </div>

            <div style="grid-column: span 2;">
                <label class="admin-label">Biografia Completa</label>
                <textarea id="sp-bio" class="admin-input" rows="5">${spk.biografia}</textarea>
            </div>

            <div style="grid-column: span 2;">
                <h4 style="color:#00A2D5; margin-top: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Redes Sociais (Opcional)</h4>
            </div>

            <div>
                <label class="admin-label"><i class="fa-brands fa-instagram"></i> Instagram</label>
                <input type="url" id="link-instagram" class="admin-input" value="${links.instagram || ''}" placeholder="https://...">
            </div>
            <div>
                <label class="admin-label"><i class="fa-brands fa-linkedin"></i> LinkedIn</label>
                <input type="url" id="link-linkedin" class="admin-input" value="${links.linkedin || ''}" placeholder="https://...">
            </div>
            <div>
                <label class="admin-label"><i class="fa-brands fa-github"></i> GitHub</label>
                <input type="url" id="link-github" class="admin-input" value="${links.github || ''}" placeholder="https://...">
            </div>
            <div>
                <label class="admin-label"><i class="fa-brands fa-researchgate"></i> ResearchGate</label>
                <input type="url" id="link-researchgate" class="admin-input" value="${links.researchgate || ''}" placeholder="https://...">
            </div>
            <div>
                <label class="admin-label"><i class="fa-solid fa-graduation-cap"></i> Currículo Lattes</label>
                <input type="url" id="link-lattes" class="admin-input" value="${links.lattes || ''}" placeholder="http://lattes...">
            </div>
            <div>
                <label class="admin-label"><i class="fa-solid fa-link"></i> Portfólio / Site Pessoal</label>
                <input type="url" id="link-portfolio" class="admin-input" value="${links.portfolio || ''}" placeholder="https://...">
            </div>
        </div>
    `;

    document.getElementById('sp-img-file').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('sp-img-preview').style.backgroundImage = `url('${e.target.result}')`;
            }
            reader.readAsDataURL(this.files[0]);
        }
    });

    document.getElementById('admin-modal').style.display = 'flex';
}

window.closeModal = function () {
    document.getElementById('admin-modal').style.display = 'none';
}

window.saveModalData = async function () {
    const confirmBtn = document.querySelector('#admin-modal button:last-child');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Gerando Página...';
    confirmBtn.disabled = true;

    try {
        if (window.currentEditingType === 'prog') {
            const ev = {
                dia_evento: parseInt(document.getElementById('ev-dia').value),
                titulo_curto: document.getElementById('ev-titulo').value,
                nome_evento: document.getElementById('ev-nome').value,
                hora_inicio: document.getElementById('ev-inicio').value,
                hora_fim: document.getElementById('ev-fim').value,
                descricao: document.getElementById('ev-desc').value
            };
            if (window.currentEditingIndex >= 0) window.adminData.programacao[window.currentEditingIndex] = ev;
            else window.adminData.programacao.push(ev);
            renderAdminLists();

            await fetch('/api/schedule/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.adminData.programacao)
            });
            window.closeModal();

        } else if (window.currentEditingType === 'speak') {

            let imageUrl = document.getElementById('sp-img-url').value;
            const fileInput = document.getElementById('sp-img-file');

            if (fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    imageUrl = data.imageUrl;
                } else {
                    alert('Erro no upload da imagem. Provavelmente excedeu os 10MB de limite.');
                }
            }

            const rawId = document.getElementById('sp-id').value;
            const finalId = rawId ? rawId.toLowerCase().replace(/[^a-z0-9-]/g, '-') : `spk-${Date.now()}`;

            const spk = {
                id: finalId,
                nome: document.getElementById('sp-nome').value,
                ocupacao: document.getElementById('sp-ocupacao').value,
                breve_descricao: document.getElementById('sp-breve').value,
                imagem: imageUrl,
                biografia: document.getElementById('sp-bio').value,
                links: {}
            };

            ['instagram', 'linkedin', 'github', 'researchgate', 'lattes', 'portfolio'].forEach(plat => {
                const val = document.getElementById(`link-${plat}`).value;
                if (val) spk.links[plat] = val;
            });

            if (window.currentEditingIndex >= 0) window.adminData.speakers[window.currentEditingIndex] = spk;
            else window.adminData.speakers.push(spk);

            renderAdminLists();

            await fetch('/api/speakers/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.adminData.speakers)
            });

            window.closeModal();
        }
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Ocorreu um erro ao salvar o item. Verifique a sua conexão.");
    } finally {
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

function initCoolAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const allScrollElements = document.querySelectorAll('.scroll-animate');
    allScrollElements.forEach(el => {

        if (el.classList.contains('section-title') || el.tagName === 'H3' || el.tagName === 'H2') return;

        gsap.fromTo(el,
            { opacity: 0, y: 30 },
            {
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                    toggleActions: "play none none reverse"
                },
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out"
            }
        );
    });

    const splitElements = document.querySelectorAll('.section-title, .about-text h3, .pesqbase-welcome');
    splitElements.forEach(el => {
        const text = el.innerText.trim();
        if (!text) return;

        el.style.opacity = "1";
        el.innerHTML = text.split(' ').map(word =>
            `<span class="split-word" style="display:inline-block; overflow:hidden; vertical-align: top;">
                <span class="word-inner" style="display:inline-block; transform:translateY(110%);">${word}&nbsp;</span>
            </span>`
        ).join('');

        const innerSpans = el.querySelectorAll('.word-inner');
        gsap.to(innerSpans, {
            y: "0%",
            duration: 0.8,
            stagger: 0.04,
            ease: "expo.out",
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none reverse"
            }
        });
    });

    const cardElements = document.querySelectorAll('.event-card, .speaker-card, .schedule-event, .hero-img');
    cardElements.forEach((el, i) => {

        el.style.opacity = "1";

        gsap.fromTo(el,
            { opacity: 0, scale: 0.95, y: 40 },
            {
                scrollTrigger: {
                    trigger: el,
                    start: "top 95%",
                    toggleActions: "play none none reverse"
                },
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.8,
                delay: (i % 3) * 0.05,
                ease: "power3.out"
            }
        );
    });

    const heroImg = document.querySelector('.hero-img');
    if (heroImg) {
        gsap.to(heroImg, {
            yPercent: 15,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero-section",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }

    const floatingIcons = document.querySelectorAll('.card-icon i, .speaker-action-btn i');
    floatingIcons.forEach(icon => {
        gsap.to(icon, {
            y: -10,
            rotation: 8,
            duration: 1.5 + Math.random(),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
        });
    });

    ScrollTrigger.refresh();
}

function initSectionNavigation() {
    const headerOffset = 100;

    document.body.addEventListener('click', function (e) {
        const link = e.target.closest('[data-section]');
        if (!link) return;

        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        let targetSection = document.getElementById(sectionId);

        if (!targetSection) {
            loadInitialPage('home').then(() => {

                requestAnimationFrame(() => {
                    targetSection = document.getElementById(sectionId);
                    if (targetSection) {
                        const sectionPosition = targetSection.getBoundingClientRect().top + window.scrollY;
                        let finalY = sectionPosition - headerOffset;
                        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                        finalY = Math.max(0, Math.min(finalY, maxScroll));
                        window.scrollTo({ top: finalY, behavior: 'smooth' });
                        updateActiveNav(sectionId);
                        history.pushState(null, null, `?page=home#${sectionId}`);
                    }
                });
            });
            return;
        }

        const sectionPosition = targetSection.getBoundingClientRect().top + window.scrollY;
        let finalY = sectionPosition - headerOffset;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        finalY = Math.max(0, Math.min(finalY, maxScroll));
        window.scrollTo({ top: finalY, behavior: 'smooth' });
        updateActiveNav(sectionId);

        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = urlParams.get('page') || 'home';
        history.pushState(null, null, `?page=${currentPage}#${sectionId}`);
    });

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + headerOffset + 50;

        const sections = document.querySelectorAll('section[id]');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                currentSectionId = section.getAttribute('id');
            }
        });

        if (window.scrollY < 100) currentSectionId = 'inicio';

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 10) {
            if (sections.length > 0) {
                currentSectionId = sections[sections.length - 1].getAttribute('id');
            }
        }

        if (currentSectionId) {
            updateActiveNav(currentSectionId);
            const currentHash = window.location.hash;
            if (currentHash !== `#${currentSectionId}`) {
                const urlParams = new URLSearchParams(window.location.search);
                const currentPage = urlParams.get('page') || 'home';
                history.replaceState(null, null, `?page=${currentPage}#${currentSectionId}`);
            }
        }
    }, { passive: true });

    function updateActiveNav(sectionId) {
        const navLinksToUpdate = document.querySelectorAll('.nav-link[data-section]');
        navLinksToUpdate.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
    }
}

function initPageNavigation() {
    document.body.addEventListener('click', function (e) {
        const link = e.target.closest('[data-page]');
        if (!link) return;

        if (link.classList.contains('speaker-action-btn')) {
            e.preventDefault();
            const rawPage = link.getAttribute('data-page');
            window.scrollTo(0, 0);
            history.pushState({ page: rawPage }, rawPage, `?page=${rawPage}`);
            loadInitialPage(rawPage);
            return;
        }

        e.preventDefault();
        const pageName = link.getAttribute('data-page');
        window.scrollTo(0, 0);
        history.pushState({ page: pageName }, pageName, `?page=${pageName}`);
        loadInitialPage(pageName);
    });
}

function initHorizontalCarousel() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error("GSAP ou ScrollTrigger não carregou.");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector("#chamadas");
    const track = section ? section.querySelector(".cards-grid") : null;
    const navbar = document.querySelector("#navbar-container .navbar");

    if (!track || !section || !navbar) {
        return;
    }

    ScrollTrigger.getAll().forEach(st => st.kill());

    ScrollTrigger.matchMedia({

        "(min-width: 1201px)": function () {

            gsap.set(section, { clearProps: "all" });
            gsap.set(track, { clearProps: "all" });
            gsap.set(navbar, { clearProps: "all" });
        },

        "(max-width: 1200px)": function () {

            gsap.set(track, { x: 0, paddingLeft: 0, paddingRight: 0 });

            setTimeout(() => {
                const cards = track.querySelectorAll('.event-card');
                if (cards.length === 0) return;

                const windowWidth = window.innerWidth;
                const cardWidth = cards[0].offsetWidth;
                const centerPadding = (windowWidth - cardWidth) / 2;

                gsap.set(track, {
                    paddingLeft: centerPadding + "px",
                    paddingRight: centerPadding + "px"
                });

                let distanceToMove = track.scrollWidth - windowWidth;

                if (distanceToMove <= 0) return;

                const anim = gsap.to(track, {
                    x: -distanceToMove,
                    ease: "none",
                });

                ScrollTrigger.create({
                    trigger: section,
                    start: "top top",
                    end: () => "+=" + distanceToMove,
                    pin: true,
                    pinSpacing: true,
                    animation: anim,
                    scrub: 1,
                    invalidateOnRefresh: true,
                    onToggle: self => {
                        if (self.isActive) {
                            gsap.to(navbar, { yPercent: -150, duration: 0.4, ease: "power2.out" });
                        } else {
                            gsap.to(navbar, { yPercent: 0, duration: 0.4, ease: "power2.in" });
                        }
                    }
                });
            }, 100);
        }
    });
}

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const inicioSection = document.getElementById('inicio');

    if (!navbar || !inicioSection) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navbar.classList.remove('navbar-solid');
            } else {
                navbar.classList.add('navbar-solid');
            }
        });
    }, { threshold: 0.1 });

    observer.observe(inicioSection);
}

function initScheduleTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const days = document.querySelectorAll('.schedule-grid');

    if (!tabs.length || !days.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            days.forEach(d => d.classList.remove('active'));

            tab.classList.add('active');
            const dayId = `day-${tab.dataset.day}`;
            document.getElementById(dayId).classList.add('active');
        });
    });
}

function initMaragogiBubbles() {
    const sections = ['inicio', 'palestrantes'];

    sections.forEach(secId => {
        const section = document.getElementById(secId);
        if (!section) return;

        if (section.querySelector('.bubbles-container')) return;

        const bubblesContainer = document.createElement('div');
        bubblesContainer.className = 'bubbles-container';
        section.appendChild(bubblesContainer);

        const bubbleCount = secId === 'inicio' ? 20 : 15;

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'maragogi-bubble';

            const size = Math.random() * 35 + 15;
            const left = Math.random() * 100;
            const duration = Math.random() * 6 + 6;
            const delay = Math.random() * 3;

            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${left}%`;
            bubble.style.animationDuration = `${duration}s`;
            bubble.style.animationDelay = `${delay}s`;

            bubblesContainer.appendChild(bubble);
        }
    });
}

function showScheduleModal(eventData) {
    let modal = document.getElementById('schedule-event-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'schedule-event-modal';
        modal.className = 'schedule-modal-overlay';
        modal.innerHTML = `
            <div class="schedule-modal-content">
                <span class="schedule-modal-close">&times;</span>
                <h3 id="schedule-modal-title"></h3>
                <p id="schedule-modal-time" class="schedule-modal-meta"></p>
                <p id="schedule-modal-track" class="schedule-modal-meta"></p>
                <div id="schedule-modal-desc"></div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.schedule-modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    document.getElementById('schedule-modal-title').textContent = eventData.titulo_curto || '';

    if (eventData.hora_inicio && eventData.hora_fim) {
        document.getElementById('schedule-modal-time').innerHTML = `<i class="fa-regular fa-clock"></i> ${eventData.hora_inicio} - ${eventData.hora_fim}`;
        document.getElementById('schedule-modal-time').style.display = 'block';
    } else {
        document.getElementById('schedule-modal-time').style.display = 'none';
    }

    if (eventData.nome_evento && eventData.nome_evento !== 'BREAK') {
        document.getElementById('schedule-modal-track').innerHTML = `<i class="fa-solid fa-layer-group"></i> Trilha: ${eventData.nome_evento}`;
        document.getElementById('schedule-modal-track').style.display = 'block';
    } else {
        document.getElementById('schedule-modal-track').style.display = 'none';
    }

    document.getElementById('schedule-modal-desc').innerHTML = eventData.descricao || '';

    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function initDeveloperBubble() {
    const bubbleOuter = document.querySelector('.dev-bubble-outer');
    const bubble = document.querySelector('.dev-bubble');
    const btnConhecer = document.querySelector('.btn-conhecer');

    if (!bubbleOuter || !bubble || !btnConhecer) return;

    bubbleOuter.addEventListener('click', (e) => {
        if (e.target.closest('.btn-conhecer')) return;

        gsap.to(bubble, {
            scale: 1.5,
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
                const pageName = btnConhecer.getAttribute('data-page');
                window.scrollTo(0, 0);
                history.pushState({ page: pageName }, pageName, `?page=${pageName}`);
                loadInitialPage(pageName);
                if (pageName === 'desenvolvedor') {
                    initEpicDeveloperAnimations();
                }
            }
        });
    });
}

function initEpicDeveloperAnimations() {
    if (typeof gsap === 'undefined') return;

    // Hero Timeline
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".gs-reveal-hero",
        { scale: 0.8, autoAlpha: 0, rotation: -10 },
        { scale: 1, autoAlpha: 1, rotation: 0, duration: 1.2 }
    )
        .fromTo(".gs-reveal-text",
            { y: 50, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.15 },
            "-=0.5"
        )
        .fromTo(".gs-reveal-hero-btn",
            { y: 30, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.6 },
            "-=0.4"
        );

    // Scroll Animados
    gsap.utils.toArray('.gs-reveal-up').forEach(elem => {
        gsap.fromTo(elem,
            { y: 100, autoAlpha: 0 },
            {
                y: 0,
                autoAlpha: 1,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: elem,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    window.applyCryptoScramble = function (elem) {
        if (!elem || elem.classList.contains('scrambled-done')) return;

        if (!elem.hasAttribute('data-crypto')) {
            elem.setAttribute('data-crypto', elem.innerHTML);
        }
        const originalHTML = elem.getAttribute('data-crypto');

        // Encontra todos os eventuais nós de texto puro (ignora tags HTML como <br> <i class=> etc)
        const textNodes = [];
        const walk = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while (n = walk.nextNode()) {
            if (n.nodeValue.trim() !== '') {
                textNodes.push({ node: n, originalText: n.nodeValue });
            }
        }

        if (textNodes.length === 0) return;
        elem.classList.add('scrambled-done');

        const chars = '!<>-_\\\\/[]{}—=+*^?#_010101';
        let iterations = 0;
        const maxIterations = 20;

        const interval = setInterval(() => {
            textNodes.forEach(item => {
                let scrambled = '';
                for (let i = 0; i < item.originalText.length; i++) {
                    if (item.originalText[i] === ' ' || item.originalText[i] === '\n') {
                        scrambled += item.originalText[i];
                        continue;
                    }
                    if (iterations > maxIterations * (i / item.originalText.length)) {
                        scrambled += item.originalText[i];
                    } else {
                        scrambled += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
                item.node.nodeValue = scrambled;
            });

            iterations++;
            if (iterations > maxIterations) {
                clearInterval(interval);
                elem.innerHTML = originalHTML; // Restaura tags HTML no final para garantir integridade
            }
        }, 40);
    };

    // Aplica Criptografia visual em Tudo que não for parágrafo <p> via ScrollTrigger
    const cryptoSelectors = [
        '.epic-title', '.epic-tag', '.glass-title', '.showcase-title',
        '.epic-section-title', '.epic-btn', '.showcase-badge', '.showcase-subtitle',
        '.glass-icon-header', '.tech-item', '.social-card-inner', '.scroll-text'
    ].join(', ');

    gsap.utils.toArray(cryptoSelectors).forEach(elem => {
        ScrollTrigger.create({
            trigger: elem,
            start: "top 95%",
            onEnter: () => window.applyCryptoScramble(elem),
            onLeaveBack: () => elem.classList.remove('scrambled-done') // Permite re-embaralhar
        });
    });

    // Efeito de Mouse Glow dinâmico
    const devContainer = document.querySelector('.epic-dev-container');
    if (devContainer) {
        let cursorGlow = devContainer.querySelector('.cursor-glow');
        if (!cursorGlow) {
            cursorGlow = document.createElement('div');
            cursorGlow.className = 'cursor-glow';
            devContainer.appendChild(cursorGlow);
        }

        devContainer.addEventListener('mousemove', (e) => {
            gsap.to(cursorGlow, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.6,
                ease: "power3.out" // Segue solto
            });
        });

        devContainer.addEventListener('mouseenter', () => gsap.to(cursorGlow, { opacity: 0.8, duration: 0.3 }));
        devContainer.addEventListener('mouseleave', () => gsap.to(cursorGlow, { opacity: 0, duration: 0.3 }));
        gsap.to(cursorGlow, { opacity: 0.8, duration: 0.5, delay: 0.5 });
    }

    // Social grid staggers
    gsap.fromTo(".gs-reveal-stagger",
        { scale: 0.8, autoAlpha: 0, y: 50 },
        {
            scale: 1, autoAlpha: 1, y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "back.out(1.5)",
            scrollTrigger: {
                trigger: ".epic-social-grid",
                start: "top 90%"
            }
        }
    );

    // Safely refresh ScrollTrigger multiple times to prevent previous visibility bugs
    setTimeout(() => ScrollTrigger.refresh(), 100);
    setTimeout(() => ScrollTrigger.refresh(), 500);
    setTimeout(() => ScrollTrigger.refresh(), 2000);
}