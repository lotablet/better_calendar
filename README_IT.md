[<img width="200" height="100" alt="banner_better-white" src="https://assets.production.linktr.ee/profiles/_next/static/logo-assets/default-meta-image.png"/>](https://linktr.ee/lotablet)  

<img width="396" height="108" alt="banner_better-white" src="https://github.com/user-attachments/assets/ff45046c-bb83-4a6e-a144-b26f6ffb9d56"/>

Un custom component completo per Home Assistant, un controller per entità calendar che include backend per gestione calendario avanzata e card frontend integrata con supporto per notifiche push e Alexa.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=lotablet&repository=better_calendar&category=Integration)

## 🌟 Caratteristiche

- **🧩 Custom Component Completo**: Backend integrato per gestione calendario avanzata
- **📅 Card Frontend Integrata**: Interfaccia calendar moderna inclusa nel component
- **📱 Notifiche Push**: Supporto notifiche mobile con timing personalizzabile
- **🔊 Notifiche Alexa**: Integrazione con dispositivi Amazon Echo
- **✏️ Gestione Eventi**: Creazione, modifica ed eliminazione eventi completa
- **🎨 Temi Multipli**: Dark, Light, Google Dark, Google Light
- **📱 Responsive**: Ottimizzato per desktop e mobile
- **🌍 Multilingua**: Supporto Italiano e Inglese
- **⏰ Timing Flessibile**: Notifiche personalizzabili da minuti a settimane prima
- **🔄 Sincronizzazione**: Supporto Google Calendar e calendari locali
- **💾 Storage Locale**: Gestione notifiche e eventi con file JSON locali

## 📦 Installazione

### Metodo 1: HACS (Raccomandato)

1. Apri HACS in Home Assistant
2. Vai su **"Archivi digitali personalizzati"** aprendo il menu in alto a destra.
3. Clicca su "Esplora e scarica repository"
4. Aggiungi `https://github.com/lotablet/better_calendar`, tipo **"Integrazione"**, Aggiungi
5. Cerca "Better Calendar" e premi scarica in basso a destra.
6. **Riavvia Home Assistant**
7. FACOLTATIVO: se non lo hai configurato, consiglio di configurare l'integrazione di Google Calendar, potete trovare la guida ufficiale qui: [Google Calendar](https://www.home-assistant.io/integrations/google/)
Altrimenti, potete aggiungere il calendario locale di Home Assistant cercando "Calendario" su integrazioni, verrà creata un entità calendar locale da utilizzare con Better Calendar.
9. Vai su **Configurazione** → **Dispositivi e Servizi**
10. Clicca **"Aggiungi Integrazione"**
11. Cerca **"Better Calendar"** e configura il tuo calendario.
    
### Metodo 2: Installazione Manuale

1. Scarica l'intero repository dalla sezione releases
2. Estrai i file nella cartella `/config/custom_components/better_calendar/`
3. La struttura deve essere:
```
/config/custom_components/better_calendar/
├── __init__.py              # Inizializzazione component
├── manifest.json            # Metadata e dipendenze
├── config_flow.py          # Configurazione UI
├── coordinator.py          # Coordinatore dati
├── sensor.py               # Sensore calendario
├── services.py             # Servizi personalizzati
├── services.yaml           # Definizioni servizi
├── const.py                # Costanti
├── utils.py                # Utilità
└── translations/           # Traduzioni
    ├── en.json
    └── it.json
└── www/                    # Card
    └── better-calendar-card.js
```
4. **Riavvia Home Assistant**
5. Aggiungi l'integrazione dal menu **Dispositivi e Servizi**

### Card Frontend Automatica

Il custom component installa automaticamente anche la card frontend `better-calendar-card.js` nella cartella `www/`. Non è necessaria installazione separata della card.

## 🔧 Configurazione

### 1. Configurazione dell'Integrazione

Dopo l'installazione, Better Calendar si configura tramite l'interfaccia grafica:

1. Vai su **Configurazione** → **Dispositivi e Servizi**
2. Clicca **"Aggiungi Integrazione"**
3. Cerca **"Better Calendar"**
4. Segui la configurazione guidata:
   - Seleziona calendario principale
   - Configura dispositivi notifiche
   - Imposta preferenze

### 2. Aggiunta della Card al Dashboard

La card è inclusa automaticamente. Aggiungi al tuo dashboard Lovelace:

```yaml
type: custom:better-calendar-card
entities:
  - calendar.google_calendar  # Lista calendari da mostrare
primary_calendar: calendar.google_calendar  # Calendario principale per nuovi eventi
theme: "dark"  # dark, light, google-dark, google-light
default_view: "monthly"  # Vista di default
```

## 📋 Configurazione Completa

### Parametri della Card

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `type` | string | **richiesto** | `custom:better-calendar-card` |
| `entities` | array | **richiesto** | Lista entità calendari da mostrare |
| `primary_calendar` | string | primo in lista | Calendario principale per eventi |
| `theme` | string | `"dark"` | Tema: `dark`, `light`, `google-dark`, `google-light` |
| `default_view` | string | `"monthly"`,`"weekly"`,`"daily"` | Vista di default: `monthly` |

### Esempio Configurazione Avanzata

```yaml
type: custom:better-calendar-card
entities:
  - calendar.google_calendar
  - calendar.lavoro
primary_calendar: calendar.google_calendar
theme: "google-dark"
default_view: "monthly"
```

### Servizi Disponibili

Il custom component espone questi servizi:

| Servizio | Descrizione |
|----------|-------------|
| `better_calendar.force_update_calendars` | Forza aggiornamento immediato calendari |
| `better_calendar.create_event` | Crea un nuovo evento nel calendario |
| `better_calendar.update_event` | Aggiorna un evento esistente |
| `better_calendar.delete_event` | Elimina un evento dal calendario |
| `better_calendar.add_notification` | Aggiunge notifica per un evento |
| `better_calendar.remove_notification` | Rimuove una notifica specifica |
| `better_calendar.toggle_notification` | Attiva/disattiva una notifica |
| `better_calendar.snooze_event` | Posticipa un evento |
| `better_calendar.mark_event_done` | Marca evento come completato |
| `better_calendar.debug_calendar_sync` | Debug sincronizzazione calendario |

## 🚀 Utilizzo

### Creazione Eventi

1. **Clicca su una data** nel calendario
2. Si apre il popup di creazione evento
3. Compila i campi:
   - **Titolo**: Nome dell'evento
   - **Descrizione**: Dettagli aggiuntivi
   - **Tutto il giorno**: Spunta per eventi giornalieri
   - **Inizio/Fine**: Data e ora
4. **Configura notifiche** (opzionale):
   - **Push**: Notifiche su dispositivi mobile
   - **Alexa**: Annunci vocali
5. Clicca **"Aggiungi Evento"**

### Gestione Notifiche

#### Notifiche Push
- Seleziona dispositivo mobile
- Scegli timing (5 min, 15 min, 1 ora, ecc.)
- Per timing personalizzato:
  - Orario specifico (es. 09:00)
  - Giorni prima (0-365)
  - Messaggio personalizzato

#### Notifiche Alexa
- Seleziona dispositivo Echo
- Configura timing e messaggio
- Supporto variabili: `{event_summary}`, `{event_time}`, `{event_date}`

### Modifica Eventi

1. Clicca sull'evento nel calendario
2. Clicca l'icona **matita** ✏️
3. Modifica i dettagli
4. Clicca **"Salva Modifiche"**

### Gestione Notifiche Evento

1. Clicca l'icona **campana** 🔔 su un evento
2. Visualizza notifiche esistenti
3. Aggiungi nuove notifiche
4. Rimuovi notifiche non necessarie

## 🔧 Configurazione Avanzata

### File di Storage

Il component crea automaticamente questi file:

```
/config/custom_components/better_calendar/
├── better_calendar_events_[ID].json
├── better_calendar_notifications_[ID].json
```

## 📱 Messaggi Personalizzati

### Variabili Disponibili

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `{event_summary}` | Titolo evento | "Riunione di lavoro" |
| `{event_time}` | Ora evento | "14:30" |
| `{event_date}` | Data evento | "21/07/2025" |
| `{offset_desc}` | Descrizione timing | "15 minuti" |

### Esempi Messaggi

**Push Notification:**
```
🔔 Promemoria: {event_summary} inizia alle {event_time} del {event_date}
```

**Alexa Announcement:**
```
Attenzione! {event_summary} inizierà tra {offset_desc}, alle {event_time}
```

## 🔍 Troubleshooting

### Problemi Comuni

#### 1. Card non viene visualizzata
- Cancella la cache del browser!


#### 2. Notifiche non funzionano
- Verifica che l'integrazione Better Calendar sia configurata
- Controlla i log: **Sviluppatore** → **Log**
- Verifica configurazione dispositivi nell'integrazione
- Controlla che i servizi mobile_app/alexa_media esistano

#### 3. Eventi non si creano
- Controlla permessi calendario nelle impostazioni integrazione
- Verifica connessione Google Calendar
- Controlla log per errori di sincronizzazione
- Controlla di aver selezionato la stessa entità calendario sia nel custom component che nella card!

#### 4. Card non viene visualizzata
- Il file `better-calendar-card.js` dovrebbe essere installato automaticamente
- Verifica in `/config/custom_components/better_calendar/www/` la presenza del file
- Se mancante, reinstalla il custom component

### Log e Debug

Abilita logging dettagliato:

```yaml
# configuration.yaml
logger:
  default: warning
  logs:
    custom_components.better_calendar: debug
    frontend.js.latest.better_calendar_card: debug
```

### Reset Configurazione

Per reset completo:

1. Rimuovi l'integrazione da **Dispositivi e Servizi**
2. Riavvia Home Assistant
3. Re-installa il custom component seguendo la guida

## 📊 Esempi Dashboard

### Dashboard Desktop

```yaml
views:
  - title: Home
    cards:
      - type: custom:better-calendar-card
        entities:
          - calendar.google_calendar
        primary_calendar: calendar.google_calendar
        theme: "google-dark"
        default_view: "monthly"
```

### Dashboard Mobile

```yaml
views:
  - title: Mobile
    cards:
      - type: custom:better-calendar-card
        entities:
          - calendar.google_calendar
        theme: "dark"
        default_view: "monthly"
```

### Dashboard Multi-Calendario

```yaml
views:
  - title: Calendari
    type: panel
    cards:
      - type: custom:better-calendar-card
        entities:
          - calendar.lavoro
          - calendar.famiglia
          - calendar.google_calendar
        primary_calendar: calendar.google_calendar
        theme: "google-light"
```

## 🤝 Contributi

### Segnalazione Bug

1. Apri una [issue](https://github.com/lotablet/better-calendar/issues)
2. Includi:
   - Versione Home Assistant
   - Versione Better Calendar
   - Configurazione integrazione
   - Log errori
   - Screenshot se utili

### Richieste Funzionalità

1. Apri una [feature request](https://github.com/lotablet/better-calendar/issues)
2. Descrivi dettagliatamente la funzionalità
3. Spiega il caso d'uso


## 📄 Licenza

Questo progetto è rilasciato sotto licenza [MIT](LICENSE).

## 🙏 Ringraziamenti

- ## Riccardo Rizzardi che ha avuto l'idea di questo custom component

---
