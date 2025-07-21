import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { loadHaComponents, DEFAULT_HA_COMPONENTS } from 'https://cdn.jsdelivr.net/npm/@kipk/load-ha-components/+esm';
loadHaComponents([
  ...DEFAULT_HA_COMPONENTS,
  'ha-selector',
  'ha-textfield',
  'ha-icon-button',
  'ha-icon',
  'ha-combo-box',
]).catch(()=>{});


/*
 * CONFIGURAZIONE GOOGLE CALENDAR:
 *
 * Esempio configurazione per usare Google Calendar:
 *
 * type: custom:better-calendar-card
 * entities:
 *   - calendar.google_calendar_nome_calendario
 * primary_calendar: calendar.google_calendar_nome_calendario  # Opzionale: specifica quale calendario usare per creare/modificare eventi
 *
 * Note:
 * - Se non specifichi primary_calendar, verrà usato il primo calendario nella lista entities
 * - Solo gli eventi del calendario principale saranno modificabili/eliminabili dalla card
 * - Gli eventi di altri calendari saranno visibili ma in sola lettura
 */

class BetterCalendarCard extends LitElement {
  static get properties() {
    return {
      _hass: { type: Object },
      config: { type: Object },
      _events: { type: Array },
      _currentDate: { type: Object },
      _calendars: { type: Array },
      _theme: { type: String }
    };
  }

  constructor() {
    super();
    this._currentDate = new Date();
    this._events = [];
    this._calendars = [];
    this._hassFetched = false;
    this._isUpdating = false;
    this._isCreatingEvent = false;
    this._isFetchingEvents = false;
    this._isSyncing = false;
    this._isFirstLoad = true;
    this._hasTriedRefresh = false; // Flag per evitare refresh multipli
    this._primaryCalendar = null;
    this._syncTimer = null;
    this._theme = 'dark';
    this._isConfigured = false; // Indica se la card è stata configurata
    this._availableCalendars = []; // Calendari disponibili nel sistema
    this._selectedCalendars = []; // Calendari selezionati dall'utente
    this._showSetup = false; // Indica se mostrare la configurazione iniziale
    this._showConfigPanel = false; // Mostra il pannello di configurazione avanzato
    this._availableDevices = []; // Dispositivi disponibili (mobile_app e Alexa)
    this._selectedLayout = 'standard'; // Layout del calendario
    this._notificationSettings = {
      mobile_enabled: false,
      alexa_enabled: false,
      mobile_devices: [],
      alexa_devices: []
    };
    this._loadSettings();
  }

  set hass(hass) {
    this._hass = hass;
    // Inizializza il sistema di traduzione con la lingua di Home Assistant
    const previousLanguage = this._language;
    this._initializeTranslations(hass);
    
    // Se la lingua è cambiata, forza un re-render
    if (previousLanguage && previousLanguage !== this._language) {
      this.requestUpdate();
    }
    
    if (!this._hassFetched) {
      this._hassFetched = true;
      this._loadCalendars();
      this._fetchEvents();
      this._loadAvailableDevices();
    }
  }

  // Sistema di traduzione multilingue
  _initializeTranslations(hass) {
    // Ottieni la lingua di Home Assistant o fallback a inglese
    const haLanguage = hass?.language || 'en';
    this._language = ['it', 'en'].includes(haLanguage) ? haLanguage : 'en';
    
    // Definizioni delle traduzioni
    this._translations = {
      it: {
        dailyView: 'Vista Giornaliera',
        weeklyView: 'Vista Settimanale', 
        monthlyView: 'Vista Mensile',
        syncCalendar: 'Sincronizza calendario',
        todayButton: 'Oggi',
        addEvent: 'Aggiungi Evento',
        notifications: 'Notifiche',
        allNotifications: 'Tutte le Notifiche',
        noNotifications: 'Nessuna notifica programmata',
        closePopup: 'Chiudi popup',
        eventDetails: 'Dettagli Evento',
        eventTime: 'Orario',
        eventLocation: 'Luogo',
        eventDescription: 'Descrizione',
        editEvent: 'Modifica',
        deleteEvent: 'Elimina',
        saveEvent: 'Salva',
        saveEditEvent: 'Salva Modifica',
        createEvent: 'Crea Evento',
        cancelEvent: 'Annulla',
        eventTitle: 'Titolo evento',
        eventStart: 'Inizio',
        eventEnd: 'Fine',
        allDay: 'Tutto il giorno',
        repeat: 'Ripeti',
        noEvents: 'Nessun evento',
        noEventsToday: 'Nessun evento per oggi',
        noEventsThisDay: 'Nessun evento per questo giorno',
        loading: 'Caricamento...',
        error: 'Errore',
        settings: 'Impostazioni',
        selectCalendars: 'Seleziona Calendari',
        theme: 'Tema',
        layout: 'Layout',
        january: 'Gennaio',
        february: 'Febbraio', 
        march: 'Marzo',
        april: 'Aprile',
        may: 'Maggio',
        june: 'Giugno',
        july: 'Luglio',
        august: 'Agosto',
        september: 'Settembre',
        october: 'Ottobre',
        november: 'Novembre',
        december: 'Dicembre',
        monday: 'Lunedì',
        tuesday: 'Martedì',
        wednesday: 'Mercoledì',
        thursday: 'Giovedì',
        friday: 'Venerdì',
        saturday: 'Sabato',
        sunday: 'Domenica',
        eventCreated: 'Evento creato',
        eventModified: 'Evento modificato',
        eventCreatedOnGoogleCalendar: 'Evento creato su Google Calendar!',
        eventModifiedOnGoogleCalendar: 'Evento modificato su Google Calendar!',
        eventModifiedSuccessfully: '✏️ Evento modificato con successo!',
        eventCreatedButNotificationError: '⚠️ Evento creato, ma errore nelle notifiche',
        syncError: '❌ Errore sincronizzazione',
        eventHandlingError: 'Errore durante la gestione dell\'evento',
        eventModificationError: 'Errore durante la modifica dell\'evento',
        invalidTimingConfiguration: '❌ Errore: configurazione timing personalizzato non valida',
        // Traduzioni popup notifiche
        notificationsFor: 'Notifiche per',
        activeNotifications: 'Notifiche Attive',
        before: 'prima',
        disabled: 'Disattivata',
        noNotificationsConfigured: 'Nessuna notifica configurata',
        addNewNotification: 'Aggiungi Nuova Notifica',
        type: 'Tipo',
        when: 'Quando', 
        device: 'Dispositivo',
        minutesBefore: 'minuti prima',
        hourBefore: 'ora prima',
        hoursBefore: 'ore prima',
        dayBefore: 'giorno prima',
        daysBefore: 'giorni prima',
        weekBefore: 'settimana prima',
        weeksBefore: 'settimane prima',
        custom: 'Personalizzato',
        number: 'Numero',
        minutes: 'Minuti',
        hours: 'Ore',
        days: 'Giorni',
        weeks: 'Settimane',
        minute: 'minuto',
        hour: 'ora',
        day: 'giorno',
        week: 'settimana',
        notificationDate: 'Data Notifica',
        pushMessage: 'Messaggio Push',
        alexaMessage: 'Messaggio Alexa',
        variables: 'Variabili',
        addNotification: 'Aggiungi Notifica',
        defaultPushMessage: 'Promemoria: {event_summary} inizia {offset_desc} (alle {event_time})',
        defaultAlexaMessage: 'Attenzione! L\'evento {event_summary} inizia {offset_desc}, alle ore {event_time}',
        // Traduzioni specifiche popup creazione
        pushNotification: 'Notifica Push',
        alexaNotification: 'Notifica Alexa',
        'minutesBefore5': '5 minuti prima',
        'minutesBefore15': '15 minuti prima',
        'minutesBefore30': '30 minuti prima',
        'hourBefore1': '1 ora prima',
        'hoursBefore2': '2 ore prima',
        'hoursBefore6': '6 ore prima',
        'hoursBefore12': '12 ore prima',
        'dayBefore1': '1 giorno prima',
        'daysBefore2': '2 giorni prima',
        'daysBefore3': '3 giorni prima',
        'weekBefore1': '1 settimana prima',
        'weeksBefore2': '2 settimane prima',
        // Traduzioni mancanti popup
        eventsForDay: 'Eventi del giorno',
        dateStart: 'Data inizio',
        dateEnd: 'Data fine',
        customNotificationDescription: 'Puoi personalizzare i messaggi usando variabili come {event_summary}, {event_time}, {offset_desc}. Lascia vuoto per usare il messaggio predefinito.',
        datetimeStart: 'Data e ora inizio',
        datetimeEnd: 'Data e ora fine',
        showDayEvents: 'Mostra Eventi del Giorno',
        hideDayEvents: 'Nascondi Eventi del Giorno',
        fillAllDayDates: 'Per favore compila le date di inizio e fine per eventi tutto il giorno',
        fillRequiredFields: 'Per favore compila tutti i campi obbligatori',
        // Traduzioni per timing personalizzato
        notificationTime: 'Orario notifica',
        daysBefore: 'Giorni prima',
        sameDay: 'Stesso giorno',
        oneDayBefore: '1 giorno prima',
        twoDaysBefore: '2 giorni prima',
        threeDaysBefore: '3 giorni prima',
        customDaysBefore: 'Giorni prima personalizzati'
      },
      en: {
        dailyView: 'Daily View',
        weeklyView: 'Weekly View',
        monthlyView: 'Monthly View', 
        syncCalendar: 'Sync calendar',
        todayButton: 'Today',
        addEvent: 'Add Event',
        notifications: 'Notifications',
        allNotifications: 'All Notifications',
        noNotifications: 'No scheduled notifications',
        closePopup: 'Close popup',
        eventDetails: 'Event Details',
        eventTime: 'Time',
        eventLocation: 'Location',
        eventDescription: 'Description',
        editEvent: 'Edit',
        deleteEvent: 'Delete',
        saveEvent: 'Save',
        saveEditEvent: 'Save Changes',
        createEvent: 'Create Event',
        cancelEvent: 'Cancel',
        eventTitle: 'Event title',
        eventStart: 'Start',
        eventEnd: 'End',
        allDay: 'All day',
        repeat: 'Repeat',
        noEvents: 'No events',
        noEventsToday: 'No events today',
        noEventsThisDay: 'No events for this day',
        loading: 'Loading...',
        error: 'Error',
        settings: 'Settings',
        selectCalendars: 'Select Calendars',
        theme: 'Theme',
        layout: 'Layout',
        january: 'January',
        february: 'February',
        march: 'March', 
        april: 'April',
        may: 'May',
        june: 'June',
        july: 'July',
        august: 'August',
        september: 'September',
        october: 'October',
        november: 'November',
        december: 'December',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
        eventCreated: 'Event created',
        eventModified: 'Event modified',
        eventCreatedOnGoogleCalendar: 'Event created on Google Calendar!',
        eventModifiedOnGoogleCalendar: 'Event modified on Google Calendar!',
        eventModifiedSuccessfully: '✏️ Event modified successfully!',
        eventCreatedButNotificationError: '⚠️ Event created, but notification error',
        syncError: '❌ Sync error',
        eventHandlingError: 'Error handling event',
        eventModificationError: 'Error modifying event',
        invalidTimingConfiguration: '❌ Error: invalid custom timing configuration',
        // Traduzioni popup notifiche
        notificationsFor: 'Notifications for',
        activeNotifications: 'Active Notifications',
        before: 'before',
        disabled: 'Disabled',
        noNotificationsConfigured: 'No notifications configured',
        addNewNotification: 'Add New Notification',
        type: 'Type',
        when: 'When',
        device: 'Device',
        minutesBefore: 'minutes before',
        hourBefore: 'hour before',
        hoursBefore: 'hours before',
        dayBefore: 'day before',
        daysBefore: 'days before',
        weekBefore: 'week before',
        weeksBefore: 'weeks before',
        custom: 'Custom',
        number: 'Number',
        minutes: 'Minutes',
        hours: 'Hours',
        days: 'Days',
        weeks: 'Weeks',
        minute: 'minute',
        hour: 'hour',
        day: 'day',
        week: 'week',
        notificationDate: 'Notification Date',
        pushMessage: 'Push Message',
        alexaMessage: 'Alexa Message',
        variables: 'Variables',
        addNotification: 'Add Notification',
        defaultPushMessage: 'Reminder: {event_summary} starts {offset_desc} (at {event_time})',
        defaultAlexaMessage: 'Attention! The event {event_summary} starts {offset_desc}, at {event_time}',
        // Traduzioni specifiche popup creazione
        pushNotification: 'Push Notification',
        alexaNotification: 'Alexa Notification',
        'minutesBefore5': '5 minutes before',
        'minutesBefore15': '15 minutes before',
        'minutesBefore30': '30 minutes before',
        'hourBefore1': '1 hour before',
        'hoursBefore2': '2 hours before',
        'hoursBefore6': '6 hours before',
        'hoursBefore12': '12 hours before',
        'dayBefore1': '1 day before',
        'daysBefore2': '2 days before',
        'daysBefore3': '3 days before',
        'weekBefore1': '1 week before',
        'weeksBefore2': '2 weeks before',
        // Traduzioni mancanti popup
        eventsForDay: 'Events for the day',
        dateStart: 'Start date',
        dateEnd: 'End date',
        customNotificationDescription: 'You can customize messages using variables like {event_summary}, {event_time}, {offset_desc}. Leave empty to use the default message.',
        datetimeStart: 'Start date and time',
        datetimeEnd: 'End date and time',
        showDayEvents: 'Show Day Events',
        hideDayEvents: 'Hide Day Events',
        fillAllDayDates: 'Please fill in start and end dates for all-day events',
        fillRequiredFields: 'Please fill in all required fields',
        // Traduzioni per timing personalizzato
        notificationTime: 'Notification time',
        daysBefore: 'Days before',
        sameDay: 'Same day',
        oneDayBefore: '1 day before',
        twoDaysBefore: '2 days before',
        threeDaysBefore: '3 days before',
        customDaysBefore: 'Custom days before'
      }
    };
  }

  // Metodo per ottenere le traduzioni
  _t(key) {
    return this._translations[this._language]?.[key] || this._translations['en']?.[key] || key;
  }

  // Metodi helper per array tradotti
  _getMonthNames() {
    return [
      this._t('january'), this._t('february'), this._t('march'), this._t('april'),
      this._t('may'), this._t('june'), this._t('july'), this._t('august'),
      this._t('september'), this._t('october'), this._t('november'), this._t('december')
    ];
  }

  _getWeekDaysShort() {
    return this._language === 'it' 
      ? ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']
      : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  }

  _getWeekDaysFull() {
    return [
      this._t('monday'), this._t('tuesday'), this._t('wednesday'), this._t('thursday'),
      this._t('friday'), this._t('saturday'), this._t('sunday')
    ];
  }

  // Helper per ottenere il locale dinamico
  _getLocale() {
    return this._language === 'it' ? 'it-IT' : 'en-US';
  }

  // Helper per formattare l'ora
  _formatTime(date) {
    return new Date(date).toLocaleTimeString(this._getLocale(), { hour: '2-digit', minute: '2-digit' });
  }



  updated(changedProps) {
    if (changedProps.has('config') && this.config) {
      this._loadCalendars();
      this._fetchEvents();
    }
  }

  setConfig(config) {
    // Accetta configurazione da Home Assistant
    this.config = config || {};

    // Se la configurazione arriva da Home Assistant, usala direttamente
    if (config && config.entities) {
      this._selectedCalendars = config.entities;
      this._primaryCalendar = config.primary_calendar || (config.entities.length > 0 ? config.entities[0] : null);
      this._theme = config.theme || 'dark';
      this._selectedView = config.default_view || 'monthly'; // Vista di default configurabile
      this._notificationSettings = {
        mobile_enabled: config.mobile_notifications_enabled || false,
        alexa_enabled: config.alexa_notifications_enabled || false,
        mobile_devices: config.mobile_devices || [],
        alexa_devices: config.alexa_devices || []
      };
      this._isConfigured = true;
      this._saveSettings();
    } else {
      // Carica dalle impostazioni salvate
      this._loadSettings();
    }
  }

  _loadSettings() {
    try {
      const savedSettings = localStorage.getItem('better-calendar-card-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this._theme = settings.theme || 'dark';
        this._selectedCalendars = settings.selectedCalendars || [];
        this._primaryCalendar = settings.primaryCalendar || null;
        this._isConfigured = settings.isConfigured || false;
        this._selectedView = settings.selectedView || settings.defaultView || 'monthly';
        this._notificationSettings = settings.notificationSettings || {
          mobile_enabled: false,
          alexa_enabled: false,
          mobile_devices: [],
          alexa_devices: []
        };
        this._settingsLoaded = true;


      } else {
        // Prima volta: imposta valori predefiniti
        this._theme = 'dark';
        this._selectedCalendars = [];
        this._primaryCalendar = null;
        this._isConfigured = false;
        this._selectedView = 'monthly';
        this._notificationSettings = {
          mobile_enabled: false,
          alexa_enabled: false,
          mobile_devices: [],
          alexa_devices: []
        };
      }
    } catch (error) {

      this._theme = 'dark';
      this._selectedCalendars = [];
      this._primaryCalendar = null;
      this._isConfigured = false;
      this._selectedLayout = 'standard';
      this._notificationSettings = {
        mobile_enabled: false,
        alexa_enabled: false,
        mobile_devices: [],
        alexa_devices: []
      };
    }
  }

  _saveSettings() {
    try {
      const settings = {
        theme: this._theme,
        selectedCalendars: this._selectedCalendars,
        primaryCalendar: this._primaryCalendar,
        isConfigured: this._isConfigured,
        selectedView: this._selectedView,
        defaultView: this.config?.default_view || this._selectedView,
        notificationSettings: this._notificationSettings
      };
      localStorage.setItem('better-calendar-card-settings', JSON.stringify(settings));

    } catch (error) {

    }
  }
  static get styles() {
    return css`
      .calendar-container {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        background-size: 400% 400%;
        animation: futuristicBg 8s ease infinite;
        padding: 24px;
        border-radius: 20px;
        color: #ffffff;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 0 60px rgba(0, 212, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.2);
        position: relative;
        overflow: hidden;
      }

      /* TEMA CHIARO */
      .calendar-container.light-theme {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        background-size: 400% 400%;
        animation: futuristicBgLight 8s ease infinite;
        color: #1a202c;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 60px rgba(59, 130, 246, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .calendar-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 50%);
        pointer-events: none;
      }

      .calendar-container.light-theme::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(219, 39, 119, 0.08) 0%, transparent 50%);
      }

      @keyframes futuristicBg {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      @keyframes futuristicBgLight {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
        gap: 16px;
      }

      .title {
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(45deg, #00d4ff, #9333ea, #ec4899, #00d4ff);
        background-size: 300% 300%;
        animation: neonText 3s ease infinite;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow:
          0 0 10px rgba(0, 212, 255, 0.5),
          0 0 20px rgba(0, 212, 255, 0.3),
          0 0 30px rgba(0, 212, 255, 0.1);
        text-transform: uppercase;
        letter-spacing: 2px;
        padding: 8px 0;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        text-align: center;
      }

      .controls-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 800px;
      }

      .calendar-container.light-theme .title {
        background: linear-gradient(45deg, #3b82f6, #7c3aed, #db2777, #3b82f6);
        background-size: 300% 300%;
        animation: neonTextLight 3s ease infinite;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow:
          0 0 10px rgba(59, 130, 246, 0.3),
          0 0 20px rgba(59, 130, 246, 0.2),
          0 0 30px rgba(59, 130, 246, 0.1);
      }

      @keyframes neonText {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      @keyframes neonTextLight {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .month-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(147, 51, 234, 0.1));
        padding: 6px 12px;
        border-radius: 20px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        backdrop-filter: blur(10px);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(0, 212, 255, 0.1);
        position: relative;
        z-index: 1;
        flex-shrink: 0;
        max-width: 100%;
      }

      .calendar-container.light-theme .month-nav {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(124, 58, 237, 0.15));
        border: 1px solid rgba(59, 130, 246, 0.4);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.1);
      }

      .month-title {
        font-size: 10px;
        font-weight: 600;
        min-width: 50px;
        text-align: center;
        color: #ffffff;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        white-space: nowrap;
        flex: 1;
      }

      .calendar-container.light-theme .month-title {
        color: #1a202c;
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
      }
      .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          padding: 0 8px;
          background: linear-gradient(90deg, rgba(0, 212, 255, 0.05), rgba(147, 51, 234, 0.05));
          border-radius: 15px;
          border: 1px solid rgba(0, 212, 255, 0.1);
          position: relative;
          z-index: 1;
      }

      .calendar-container.light-theme .weekdays {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(124, 58, 237, 0.08));
        border: 1px solid rgba(59, 130, 246, 0.2);
      }

      .weekday {
        padding: 12px 8px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: rgba(0, 212, 255, 0.8);
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        transition: all 0.3s ease;
      }

      .calendar-container.light-theme .weekday {
        color: rgba(59, 130, 246, 0.9);
        text-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
      }

      .weekday.weekend {
        color: #ff3333 !important;
        text-shadow: 0 0 5px rgba(255, 51, 51, 0.3);
      }

      .calendar-container.light-theme .weekday.weekend {
        color: #dd0000 !important;
        text-shadow: 0 0 5px rgba(221, 0, 0, 0.2);
      }

      .weekday:hover {
        color: #ffffff;
        text-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
        transform: scale(1.05);
      }

      .calendar-container.light-theme .weekday:hover {
        color: #1a202c;
        text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
      }

      .days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 10px;
        padding: 8px;
        position: relative;
        z-index: 1;
      }

      .day {
        aspect-ratio: 1 / 1;
        width: 100%;
        min-width: 0;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border-radius: 8px;
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        overflow: hidden;
        box-sizing: border-box;
      }

      /* Fallback per browser che non supportano aspect-ratio */
      @supports not (aspect-ratio: 1 / 1) {
        .day {
          height: 0;
          padding-bottom: 100%;
        }
      }

      /* Media queries per risoluzioni più piccole */
      @media (max-width: 480px) {
        .days {
          gap: 6px;
          padding: 6px;
        }

        .day {
          font-size: 12px;
          min-width: 32px;
          min-height: 32px;
        }
      }

      @media (max-width: 320px) {
        .days {
          gap: 4px;
          padding: 4px;
        }

        .day {
          font-size: 11px;
          min-width: 28px;
          min-height: 28px;
        }
      }

      .calendar-container.light-theme .day {
        color: rgba(30, 41, 59, 0.9);
      }

      .day:not(.empty):hover {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(147, 51, 234, 0.15));
        transform: scale(1.05);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.2);
        border-color: rgba(0, 212, 255, 0.4);
        color: #ffffff;
      }

      .calendar-container.light-theme .day:not(.empty):hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2));
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: #1a202c;
      }

      .day.today {
        color: #ffffff;
        font-weight: 700;

        background: linear-gradient(135deg, #00d4ff, #0099cc) !important;
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.6), 0 0 25px rgba(0, 212, 255, 0.3) !important;
        border-color: rgba(0, 212, 255, 0.8) !important;
      }
      .calendar-container.light-theme .day.today, .calendar-container.dark-theme .day.today {
          background: linear-gradient(135deg, rgb(143 179 239), rgb(165 190 244)) !important;
          box-shadow: rgba(59, 130, 246, 0.6) 0px 0px 15px, rgba(59, 130, 246, 0.3) 0px 0px 25px !important;
          border-color: rgba(59, 130, 246, 0.8) !important;
          border-radius: 8px !important;
      }
      .calendar-container.light-theme .day, .calendar-container.dark-theme .day {
          border-radius: 8px !important;
      }
      .day.weekend {
        color: #ff3333 !important;
        text-shadow: 0 0 5px rgba(255, 51, 51, 0.3);
      }

      .calendar-container.light-theme .day.weekend {
        color: #dd0000 !important;
        text-shadow: 0 0 5px rgba(221, 0, 0, 0.2);
      }

      .day.holiday {
        color: rgba(236, 72, 153, 1);
        font-weight: 700;
        text-shadow: 0 0 8px rgba(236, 72, 153, 0.5);
      }

      .calendar-container.light-theme .day.holiday {
        color: rgba(219, 39, 119, 1);
        text-shadow: 0 0 8px rgba(219, 39, 119, 0.3);
      }

      @keyframes holidayGlow {
        from {
          box-shadow: 0 0 5px rgba(236, 72, 153, 0.3);
        }
        to {
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.6);
        }
      }

      .day.has-events::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(45deg, #00d4ff, #9333ea);
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
        animation: eventPulse 2s ease-in-out infinite;
      }

      .calendar-container.light-theme .day.has-events::after {
        background: linear-gradient(45deg, #3b82f6, #7c3aed);
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
      }

      /* Nascondi pallini blu nei temi Google - mostra solo gialli per eventi con notifiche */
      .calendar-container.google-dark-theme .day.has-events::after,
      .calendar-container.google-light-theme .day.has-events::after {
        display: none;
      }



      .day.has-notifications::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(45deg, #fbbf24, #f59e0b);
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
        animation: notificationPulse 2s ease-in-out infinite;
      }

      .calendar-container.light-theme .day.has-notifications::after {
        background: linear-gradient(45deg, #f59e0b, #d97706);
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
      }

      /* Nascondi anche i pallini gialli nei temi Google - l'evento stesso diventa giallo */
      .calendar-container.google-dark-theme .day.has-notifications::after,
      .calendar-container.google-light-theme .day.has-notifications::after {
        display: none;
      }

      /* Pallino arancione per notifiche Alexa */
      .day.has-alexa-notifications::before {
        content: '🔊';
        position: absolute;
        top: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background: linear-gradient(45deg, #ff9800, #ff5722);
        border-radius: 50%;
        font-size: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
        animation: alexaPulse 2s ease-in-out infinite;
        z-index: 10;
      }

      .calendar-container.light-theme .day.has-alexa-notifications::before {
        background: linear-gradient(45deg, #f57c00, #e65100);
        box-shadow: 0 0 8px rgba(245, 124, 0, 0.6);
      }

      /* Nascondi il pallino Alexa nei temi Google (l'evento diventa giallo) */
      .calendar-container.google-dark-theme .day.has-alexa-notifications::before,
      .calendar-container.google-light-theme .day.has-alexa-notifications::before {
        display: none;
      }

      @keyframes alexaPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.15);
          opacity: 1;
        }
      }

      @keyframes notificationPulse {
        0%, 100% {
          transform: translateX(-50%) scale(1);
          opacity: 0.8;
        }
        50% {
          transform: translateX(-50%) scale(1.2);
          opacity: 1;
        }
      }

      @keyframes eventPulse {
        0%, 100% {
          transform: translateX(-50%) scale(1);
          opacity: 0.8;
        }
        50% {
          transform: translateX(-50%) scale(1.2);
          opacity: 1;
        }
      }

      .day.empty {
        cursor: default;
        opacity: 0.3;
      }

      .nav-button {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(147, 51, 234, 0.2));
        border: 1px solid rgba(0, 212, 255, 0.4);
        color: #ffffff;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        font-weight: bold;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(0, 212, 255, 0.1);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }

      .calendar-container.light-theme .nav-button {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2));
        border: 1px solid rgba(59, 130, 246, 0.4);
        color: #1a202c;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.1);
      }

      .nav-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .nav-button:hover {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(147, 51, 234, 0.4));
        transform: scale(1.1);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(0, 212, 255, 0.3);
      }

      .calendar-container.light-theme .nav-button:hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(124, 58, 237, 0.4));
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 30px rgba(59, 130, 246, 0.3);
      }

      .nav-button:hover::before {
        left: 100%;
      }

      .nav-button:active {
        transform: scale(0.95);
      }

      .sync-button {
        background: linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2));
        border: 1px solid rgba(147, 51, 234, 0.4);
        color: #ffffff;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        font-weight: bold;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(147, 51, 234, 0.1);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }

      .calendar-container.light-theme .sync-button {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(219, 39, 119, 0.2));
        border: 1px solid rgba(124, 58, 237, 0.4);
        color: #1a202c;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(124, 58, 237, 0.1);
      }

      .sync-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .sync-button:hover {
        background: linear-gradient(135deg, rgba(147, 51, 234, 0.4), rgba(236, 72, 153, 0.4));
        transform: scale(1.1);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(147, 51, 234, 0.3);
      }

      .calendar-container.light-theme .sync-button:hover {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(219, 39, 119, 0.4));
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 30px rgba(124, 58, 237, 0.3);
      }

      .sync-button:hover::before {
        left: 100%;
      }

      .sync-button.syncing {
        animation: syncRotate 1s linear infinite;
      }

      @keyframes syncRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .settings-button {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2));
        border: 1px solid rgba(255, 165, 0, 0.4);
        color: #ffffff;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        font-weight: bold;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(255, 165, 0, 0.1);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }

      .calendar-container.light-theme .settings-button {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(124, 58, 237, 0.2));
        border: 1px solid rgba(251, 146, 60, 0.4);
        color: #1a202c;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(251, 146, 60, 0.1);
      }

      .settings-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .settings-button:hover {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.4), rgba(147, 51, 234, 0.4));
        transform: scale(1.1);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(255, 165, 0, 0.3);
      }

      .calendar-container.light-theme .settings-button:hover {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.4), rgba(124, 58, 237, 0.4));
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 30px rgba(251, 146, 60, 0.3);
      }

      .settings-button:hover::before {
        left: 100%;
      }

      /* PULSANTI VISTA */
      .view-buttons {
        display: flex;
        gap: 4px;
        margin: 0 8px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(147, 51, 234, 0.1));
        padding: 4px;
        border-radius: 12px;
        border: 1px solid rgba(0, 212, 255, 0.2);
      }

      .light-theme .view-buttons {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(124, 58, 237, 0.15));
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .view-button {
        background: transparent;
        border: 1px solid transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        min-width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .light-theme .view-button {
        color: rgba(30, 41, 59, 0.7);
      }

      .view-button:hover {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(147, 51, 234, 0.2));
        color: #ffffff;
        border-color: rgba(0, 212, 255, 0.4);
        transform: scale(1.05);
      }

      .light-theme .view-button:hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(124, 58, 237, 0.25));
        color: #1a202c;
        border-color: rgba(59, 130, 246, 0.4);
      }

      .view-button.active {
        background: linear-gradient(135deg, #00d4ff, #9333ea);
        color: #ffffff;
        border-color: rgba(0, 212, 255, 0.6);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
        font-weight: 700;
      }

      .light-theme .view-button.active {
        background: linear-gradient(135deg, #3b82f6, #7c3aed);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
      }

      .day-container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .event-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3182ce;
        margin-top: -2px;
        opacity: 0;
        transform: scale(0);
        transition: all 0.3s ease;
      }

      .event-indicator.has-event {
        opacity: 1;
        transform: scale(1);
      }

      .multiple-events::after {
        content: '';
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #3182ce;
        right: -2px;
        bottom: 2px;
      }

      /* VISTA GIORNALIERA */
      .daily-view {
        padding: 16px;
        height: 400px;
        overflow-y: auto;
      }

      .daily-events {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .daily-event {
        background: rgba(255, 255, 255, 0.05);
        padding: 16px;
        border-radius: 12px;
        border-left: 4px solid #007acc;
        transition: all 0.3s ease;
        position: relative;
      }

      .daily-event:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(4px);
      }

      .light-theme .daily-event {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }

      .light-theme .daily-event:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .event-time {
        font-size: 14px;
        color: #aaa;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .light-theme .event-time {
        color: #666;
      }

      .all-day-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }

      .event-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #fff;
      }

      .light-theme .event-title {
        color: #333;
      }

      .event-description {
        font-size: 14px;
        color: #ccc;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .light-theme .event-description {
        color: #666;
      }

      .event-calendar {
        font-size: 12px;
        color: #888;
        font-style: italic;
      }

      .light-theme .event-calendar {
        color: #999;
      }

      .no-events-today {
        text-align: center;
        padding: 60px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        border: 2px dashed rgba(255, 255, 255, 0.1);
      }

      .light-theme .no-events-today {
        background: rgba(0, 0, 0, 0.02);
        border: 2px dashed rgba(0, 0, 0, 0.1);
      }

      .no-events-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .no-events-text {
        font-size: 16px;
        color: #aaa;
        margin-bottom: 20px;
      }

      .light-theme .no-events-text {
        color: #666;
      }

      .add-event-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .add-event-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }

      /* PULSANTI EVENTI VISTA GIORNALIERA */
      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .event-actions {
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .daily-event:hover .event-actions {
        opacity: 1;
      }

      .event-edit-btn,
      .event-delete-btn {
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 6px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
        padding: 0;
        color: rgba(255, 255, 255, 0.8);
      }

      .light-theme .event-edit-btn,
      .light-theme .event-delete-btn {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: rgba(0, 0, 0, 0.8);
      }

      .event-edit-btn:hover {
        background: rgba(255, 165, 0, 0.2);
        border-color: rgba(255, 165, 0, 0.5);
        color: #ffa500;
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
      }

      .event-delete-btn:hover {
        background: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.5);
        color: #ec4899;
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
      }

      /* VISTA SETTIMANALE - LAYOUT VERTICALE UNIVERSALE */
      .weekly-view {
        display: flex;
        flex-direction: column;
        height: auto;
        min-height: 500px;
        position: relative;
        z-index: 1;
      }

      .week-header {
        display: none; /* Nascosto sempre - layout verticale universale */
      }

      .light-theme .week-header {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.12), rgba(124, 58, 237, 0.12));
        border: 1px solid rgba(59, 130, 246, 0.25);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      /* Stili header non più necessari - layout verticale universale */

      .week-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px;
        flex: 1;
        position: relative;
        z-index: 1;
      }

      .week-day {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          padding: 4px;
          border-radius: 15px;
          cursor: pointer;
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(147, 51, 234, 0.15));
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          font-family: Orbitron, Roboto, sans-serif;
          overflow: hidden;
          position: relative;
          min-height: 60px;
          gap: 0px;
      }

      .light-theme .week-day {
        color: rgba(30, 41, 59, 0.9);
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .week-day:hover {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(147, 51, 234, 0.15));
        transform: scale(1.02);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.2);
        border-color: rgba(0, 212, 255, 0.4);
        color: #ffffff;
      }

      .light-theme .week-day:hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2));
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: #1a202c;
      }

      .week-day.today {
        color: #ffffff;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #0099cc) !important;
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.6), 0 0 25px rgba(0, 212, 255, 0.3) !important;
        border-color: rgba(0, 212, 255, 0.8) !important;
      }

      .light-theme .week-day.today {
        background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.6), 0 0 25px rgba(59, 130, 246, 0.3) !important;
        border-color: rgba(59, 130, 246, 0.8) !important;
      }

      .week-day.weekend {
        color: #ff3333 !important;
        text-shadow: 0 0 5px rgba(255, 51, 51, 0.3);
      }

      .light-theme .week-day.weekend {
        color: #dd0000 !important;
        text-shadow: 0 0 5px rgba(221, 0, 0, 0.2);
      }

      .week-event {
        background: linear-gradient(45deg, #00d4ff, #9333ea);
        color: white;
        padding: 14px 16px;
        margin-bottom: 0;
        border-radius: 12px;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: start;
        box-shadow: 0 3px 12px rgba(0, 212, 255, 0.3);
        font-family: 'Roboto', sans-serif;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.15);
        line-height: 1.4;
      }

      .light-theme .week-event {
        background: linear-gradient(45deg, #3b82f6, #7c3aed);
        box-shadow: 0 3px 12px rgba(59, 130, 246, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .light-theme .week-event:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        border-color: rgba(255, 255, 255, 0.4);
      }

      .week-event:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .week-event-title {
          font-weight: 600;
          text-overflow: unset;
          overflow: visible;
          white-space: normal;
          overflow-wrap: break-word;
          word-break: break-word;
          margin-bottom: 0;
          line-height: 2;
          text-align: start;
          font-size: 10px;
          max-width: 100%;
      }

      .week-event-time {
        font-size: 13px;
        opacity: 0.9;
        font-weight: 600;
        text-align: start;
        letter-spacing: 0.3px;
      }

      /* Stili vecchio layout non più necessari */

      /* Layout universale: Sempre verticale */
      .mobile-layout {
        display: flex !important; /* Sempre visibile - layout universale */
      }

      .desktop-layout {
        display: none !important; /* Sempre nascosto - layout universale verticale */
      }

      /* Stili per il layout verticale universale */
      .week-day-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 90px;
        padding-right: 20px;
        border-right: 3px solid rgba(0, 212, 255, 0.4);
      }

      .light-theme .week-day-info {
        border-right-color: rgba(59, 130, 246, 0.4);
      }

      .week-day-name-mobile {
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        color: rgba(0, 212, 255, 0.9);
        margin-bottom: 6px;
        letter-spacing: 1.2px;
        font-family: 'Orbitron', 'Roboto', sans-serif;
      }

      .light-theme .week-day-name-mobile {
        color: rgba(59, 130, 246, 0.95);
      }

      .week-day-number-mobile {
        font-size: 28px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .light-theme .week-day-number-mobile {
        color: rgba(30, 41, 59, 0.95);
        text-shadow: 0 1px 3px rgba(255, 255, 255, 0.5);
      }

      .week-day.today .week-day-info {
        border-right-color: rgba(255, 255, 255, 0.8);
      }

      .week-day.today .week-day-name-mobile,
      .week-day.today .week-day-number-mobile {
        color: #ffffff;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
      }

      .week-events-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-left: 20px;
      }

      .week-day-empty-mobile {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-left: 20px;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
        font-family: 'Roboto', sans-serif;
      }

      .light-theme .week-day-empty-mobile {
        color: rgba(0, 0, 0, 0.4);
      }

      /* ========================================
         RESPONSIVITÀ MOBILE PER ALTRE VISTE
         ======================================== */
      @media (max-width: 768px) {

        /* ==== FIX SOVRAPPOSIZIONE HEADER MOBILE ==== */

        /* Layout compatto per header mobile - evita sovrapposizioni */
        .calendar-container .header {
          position: relative;
          z-index: 10;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          min-height: 70px;
          padding: 6px 0;
        }

        /* Ottimizzazione titolo per evitare sovrapposizioni */
        .calendar-container .month-title {
          position: relative;
          z-index: 5;
          margin: 2px 0 6px 0;
          font-size: 13px;
          max-width: 65%;
          padding: 0 8px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          order: -1;
        }

        /* Layout intelligente per navigazione - pulsanti separati */
        .calendar-container .month-nav {
          position: relative;
          z-index: 10;
          display: flex !important;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          width: 100%;
          padding: 0 12px;
          gap: 8px;
          min-height: 40px;
        }

        /* Pulsanti navigazione dimensioni ottimizzate */
        .calendar-container .nav-button,
        .calendar-container .sync-button {
          width: 34px;
          height: 34px;
          padding: 6px;
          flex-shrink: 0;
          border-radius: 8px;
        }

        /* Pulsanti vista compatti */
        .calendar-container .view-buttons {
          gap: 3px;
          display: flex;
          flex-wrap: nowrap;
          order: 2;
        }

        .calendar-container .view-button {
          padding: 5px 9px;
          font-size: 11px;
          min-width: 30px;
          height: 34px;
          border-radius: 6px;
        }

        /* Layout ordinato per elementi di navigazione */
        .calendar-container .month-nav .nav-button:first-child {
          order: 0;
          margin-right: auto;
        }

        .calendar-container .month-nav .nav-button:last-of-type:not(.sync-button) {
          order: 1;
          margin-left: auto;
        }

        .calendar-container .month-nav .sync-button {
          order: 3;
          margin-left: 6px;
        }

        /* ==== FINE FIX SOVRAPPOSIZIONE ==== */

        /* Migliore leggibilità per vista mensile mobile */
        .days {
          gap: 4px;
        }

        .day {
          font-size: 16px;
          min-height: 45px;
          padding: 8px 4px;
        }

        /* Vista giornaliera mobile */
        .daily-view .day-events .event {
          font-size: 15px;
          padding: 12px 16px;
        }

        .daily-view .day-events .event-title {
          font-size: 16px;
          font-weight: 600;
        }

        .daily-view .day-events .event-time {
          font-size: 14px;
        }
      }

      /* Layout per schermi molto piccoli */
      @media (max-width: 480px) {

        /* ==== FIX EXTRA PER SCHERMI PICCOLI ==== */

        /* Titolo ancora più compatto per schermi piccoli */
        .calendar-container .month-title {
          font-size: 12px;
          max-width: 60%;
          margin: 1px 0 4px 0;
          padding: 0 6px;
        }

        /* Pulsanti ridotti per schermi piccoli */
        .calendar-container .nav-button,
        .calendar-container .sync-button {
          width: 30px;
          height: 30px;
          padding: 4px;
        }

        .calendar-container .view-button {
          padding: 4px 7px;
          font-size: 10px;
          min-width: 26px;
          height: 30px;
        }

        .calendar-container .month-nav {
          gap: 6px;
          padding: 0 8px;
          min-height: 36px;
        }

        .calendar-container .header {
          min-height: 60px;
          padding: 4px 0;
        }

        /* ==== FINE FIX SCHERMI PICCOLI ==== */

        /* Header navigazione più compatto */
        .controls {
          padding: 8px 12px;
          gap: 8px;
        }

        .nav-button {
          width: 35px;
          height: 35px;
          font-size: 16px;
        }

        .current-period {
          font-size: 14px;
          padding: 8px 12px;
        }

        .view-switcher button {
          width: 35px;
          height: 35px;
          font-size: 12px;
          padding: 0;
        }

        /* Vista settimanale mobile */
        .weekly-view {
          min-height: 450px;
        }

        .week-body {
          gap: 8px;
          padding: 4px;
        }

        .week-day {
          padding: 12px;
          min-height: 70px;
        }

        .week-day-info {
          min-width: 65px;
          padding-right: 12px;
        }

        .week-day-name-mobile {
          font-size: 11px;
          margin-bottom: 4px;
        }

        .week-day-number-mobile {
          font-size: 20px;
        }

        .week-event {
          font-size: 12px;
          padding: 10px 12px;
        }

        .week-event-title {
          font-size: 12px;
          line-height: 1.2;
        }

        .week-event-time {
          font-size: 11px;
        }

        .week-events-container {
          padding-left: 12px;
          gap: 6px;
        }

        /* Vista giornaliera mobile */
        .daily-view {
          padding: 12px;
          height: 350px;
        }

        .daily-events {
          gap: 10px;
        }

        .daily-event {
          padding: 12px;
        }

        .event-title {
          font-size: 16px;
          line-height: 1.3;
          word-break: break-word;
        }

        .event-time {
          font-size: 13px;
          margin-bottom: 6px;
        }

        .event-description {
          font-size: 13px;
          line-height: 1.3;
        }

        .event-actions {
          gap: 6px;
        }

        .event-edit-btn,
        .event-delete-btn {
          width: 28px;
          height: 28px;
          font-size: 12px;
        }

        /* Vista mensile mobile */
        .days {
          gap: 2px;
        }

        .day {
          font-size: 14px;
          min-height: 40px;
          padding: 6px 2px;
        }

        .day-number {
          font-size: 14px;
        }

        .event-indicator {
          width: 4px;
          height: 4px;
        }
      }

      /* Layout per schermi ultra-stretti */
      @media (max-width: 320px) {

        /* ==== FIX CRITICAL PER SCHERMI ULTRA-PICCOLI ==== */

        /* Titolo minimo per evitare sovrapposizioni critiche */
        .calendar-container .month-title {
          font-size: 11px;
          max-width: 55%;
          margin: 0px 0 3px 0;
          padding: 0 4px;
          line-height: 1.1;
        }

        /* Pulsanti mini per schermi ultra-stretti */
        .calendar-container .nav-button,
        .calendar-container .sync-button {
          width: 28px;
          height: 28px;
          padding: 3px;
        }

        .calendar-container .view-button {
          padding: 3px 5px;
          font-size: 9px;
          min-width: 22px;
          height: 28px;
        }

        .calendar-container .month-nav {
          gap: 4px;
          padding: 0 6px;
          min-height: 32px;
        }

        .calendar-container .header {
          min-height: 50px;
          padding: 2px 0;
        }

        /* ==== FINE FIX SCHERMI ULTRA-PICCOLI ==== */

        /* Header ancora più compatto */
        .controls {
          padding: 6px 8px;
          gap: 6px;
        }

        .nav-button {
          width: 32px;
          height: 32px;
          font-size: 14px;
        }

        .current-period {
          font-size: 12px;
          padding: 6px 8px;
        }

        .view-switcher button {
          width: 32px;
          height: 32px;
          font-size: 11px;
        }

        /* Vista settimanale ultra-compatta */
        .weekly-view {
          min-height: 400px;
        }

        .week-body {
          gap: 6px;
          padding: 2px;
        }

        .week-day {
          padding: 8px;
          min-height: 60px;
        }

        .week-day-info {
          min-width: 55px;
          padding-right: 8px;
          border-right-width: 2px;
        }

        .week-day-name-mobile {
          font-size: 10px;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }

        .week-day-number-mobile {
          font-size: 18px;
        }

        .week-event {
          font-size: 11px;
          padding: 8px 10px;
        }

        .week-event-title {
          font-size: 11px;
          line-height: 1.1;
          margin-bottom: 2px;
        }

        .week-event-time {
          font-size: 10px;
        }

        .week-events-container {
          padding-left: 8px;
          gap: 4px;
        }

        /* Vista giornaliera ultra-compatta */
        .daily-view {
          padding: 8px;
          height: 320px;
        }

        .daily-events {
          gap: 8px;
        }

        .daily-event {
          padding: 10px;
        }

        .event-title {
          font-size: 14px;
          line-height: 1.2;
        }

        .event-time {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .event-description {
          font-size: 12px;
          line-height: 1.2;
        }

        .event-actions {
          gap: 4px;
        }

        .event-edit-btn,
        .event-delete-btn {
          width: 26px;
          height: 26px;
          font-size: 11px;
        }

        /* Vista mensile ultra-compatta */
        .calendar-header {
          font-size: 11px;
          padding: 6px 4px;
        }

        .days {
          gap: 1px;
        }

        .day {
          font-size: 12px;
          min-height: 35px;
          padding: 4px 1px;
        }

        .day-number {
          font-size: 12px;
        }

        .event-indicator {
          width: 3px;
          height: 3px;
        }

        /* No events message compatto */
        .no-events-today {
          padding: 40px 15px;
        }

        .no-events-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .no-events-text {
          font-size: 14px;
          margin-bottom: 16px;
        }

        .add-event-button {
          padding: 10px 20px;
          font-size: 12px;
        }
      }

      /* ========================================
         TEMI GOOGLE CALENDAR - UNIFICATI
         ======================================== */
      .calendar-container.google-dark-theme,
      .calendar-container.google-light-theme {
        border: none;
        border-radius: 12px;
        font-family: 'Product Sans', 'Roboto', sans-serif;
        overflow: hidden;
      }

      .calendar-container.google-dark-theme {
        background: #202124;
        color: #e8eaed;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .calendar-container.google-light-theme {
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
        color: #202124;
        box-shadow: 0 4px 12px rgba(60, 64, 67, 0.15);
      }

      .calendar-container.google-dark-theme::before,
      .calendar-container.google-light-theme::before {
        display: none;
      }

      .calendar-container.google-dark-theme .header,
      .calendar-container.google-light-theme .header {
        border-bottom: none;
        padding: 20px 24px;
        margin-bottom: 0;
      }

      .calendar-container.google-dark-theme .header {
        background: #202124;
      }

      .calendar-container.google-light-theme .header {
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
      }

      .calendar-container.google-dark-theme .month-title,
      .calendar-container.google-light-theme .month-title {
        font-weight: 400;
        font-size: 24px;
        letter-spacing: -0.5px;
      }

      .calendar-container.google-dark-theme .month-title {
        color: #ffffff;
      }

      .calendar-container.google-light-theme .month-title {
        color: #202124;
      }

      .calendar-container.google-dark-theme .weekdays,
      .calendar-container.google-light-theme .weekdays {
        border-bottom: none;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        margin: 0;
        padding: 0 24px;
      }

      .calendar-container.google-dark-theme .weekdays {
        background: #202124;
      }

      .calendar-container.google-light-theme .weekdays {
        background: transparent;
      }

      .calendar-container.google-dark-theme .weekday,
      .calendar-container.google-light-theme .weekday {
        font-size: 12px;
        font-weight: 400;
        padding: 8px 0;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: none;
      }

      .calendar-container.google-dark-theme .weekday {
        color: #9aa0a6;
      }

      .calendar-container.google-light-theme .weekday {
        color: #5f6368;
      }

      .calendar-container.google-dark-theme .days,
      .calendar-container.google-light-theme .days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        margin: 0;
        padding: 12px 24px 24px;
      }

      .calendar-container.google-light-theme .days {
        background: #ffffff;
      }

      .calendar-container.google-dark-theme .day {
        background: transparent;
        border: none;
        min-height: 80px;
        padding: 12px;
        font-weight: 400;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid rgba(0, 212, 255, 0.1);
      }
      .calendar-container.google-light-theme .day {
        background: transparent;
        border: none;
        min-height: 80px;
        padding: 12px;
        font-weight: 400;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        border-radius: 12px;
        cursor: pointer;
        color: #202124;
        border: 1px solid rgba(60, 64, 67, 0.12);
      }
      .calendar-container.google-dark-theme .day {
        color: #e8eaed;
      }

      .calendar-container.google-dark-theme .day:not(.empty):hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .calendar-container.google-light-theme .day:not(.empty):hover {
        background: rgba(66, 133, 244, 0.08);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(60, 64, 67, 0.15);
      }

      .calendar-container.google-dark-theme .day.today,
      .calendar-container.google-light-theme .day.today {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(66, 133, 244, 0.4);
        transform: scale(1.05);
      }

      .calendar-container.google-dark-theme .day.today:hover,
      .calendar-container.google-light-theme .day.today:hover {
        background: linear-gradient(135deg, #5294f5 0%, #4bb865 100%);
        transform: scale(1.05) translateY(-2px);
      }

      .calendar-container.google-dark-theme .day.weekend {
        color: #ff5555 !important;
      }

      .calendar-container.google-light-theme .day.weekend {
        color: #cc0000 !important;
      }

      .calendar-container.google-light-theme .day-number {
        color: #202124;
        font-weight: 500;
      }

      .calendar-container.google-light-theme .day.today .day-number {
        color: #ffffff;
        font-weight: 600;
      }

      /* Numeri dei giorni weekend per temi Google */
      .calendar-container.google-dark-theme .day.weekend .day-number {
        color: #ff5555 !important;
        font-weight: 600;
      }

      .calendar-container.google-light-theme .day.weekend .day-number {
        color: #cc0000 !important;
        font-weight: 600;
      }

      .calendar-container.google-dark-theme .nav-button,
      .calendar-container.google-light-theme .nav-button,
      .calendar-container.google-dark-theme .sync-button,
      .calendar-container.google-light-theme .sync-button {
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .calendar-container.google-dark-theme .nav-button {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      .calendar-container.google-light-theme .nav-button {
        background: rgba(66, 133, 244, 0.1);
        color: #4285f4;
      }

      .calendar-container.google-dark-theme .nav-button:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }

      .calendar-container.google-light-theme .nav-button:hover {
        background: rgba(66, 133, 244, 0.2);
        transform: scale(1.1);
      }

      .calendar-container.google-dark-theme .sync-button,
      .calendar-container.google-light-theme .sync-button {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
      }

      .calendar-container.google-dark-theme .sync-button:hover,
      .calendar-container.google-light-theme .sync-button:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 16px rgba(66, 133, 244, 0.4);
      }

      .calendar-container.google-dark-theme .view-buttons,
      .calendar-container.google-light-theme .view-buttons {
        border: none;
        padding: 4px;
        gap: 4px;
        border-radius: 12px;
        backdrop-filter: blur(10px);
      }

      .calendar-container.google-dark-theme .view-buttons {
        background: rgba(255, 255, 255, 0.1);
      }

      .calendar-container.google-light-theme .view-buttons {
        background: rgba(66, 133, 244, 0.1);
      }

      .calendar-container.google-dark-theme .view-button,
      .calendar-container.google-light-theme .view-button {
        background: transparent;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        padding: 8px 16px;
        transition: all 0.3s ease;
        font-size: 14px;
      }

      .calendar-container.google-dark-theme .view-button {
        color: #ffffff;
      }

      .calendar-container.google-light-theme .view-button {
        color: #4285f4;
      }

      .calendar-container.google-dark-theme .view-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .calendar-container.google-light-theme .view-button:hover {
        background: rgba(66, 133, 244, 0.2);
      }

      .calendar-container.google-dark-theme .view-button.active,
      .calendar-container.google-light-theme .view-button.active {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
      }

      /* Eventi Google Calendar - Unificati */
      .calendar-container.google-dark-theme .day-event,
      .calendar-container.google-light-theme .day-event {
        background: rgba(66, 133, 244, 0.8);
        color: #ffffff;
        padding: 4px 10px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 3px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        max-width: 100%;
      }

      .calendar-container.google-dark-theme .day-event:hover,
      .calendar-container.google-light-theme .day-event:hover {
        background: rgba(66, 133, 244, 1);
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
      }

      .calendar-container.google-dark-theme .day-event:nth-child(even),
      .calendar-container.google-light-theme .day-event:nth-child(even) {
        background: rgba(52, 168, 83, 0.8);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .calendar-container.google-dark-theme .day-event:nth-child(even):hover,
      .calendar-container.google-light-theme .day-event:nth-child(even):hover {
        background: rgba(52, 168, 83, 1);
        box-shadow: 0 2px 8px rgba(52, 168, 83, 0.4);
      }

      .calendar-container.google-dark-theme .day-events,
      .calendar-container.google-light-theme .day-events {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 40px;
        overflow: hidden;
        margin-top: auto;
        align-items: center;
      }

      .calendar-container.google-dark-theme .more-events,
      .calendar-container.google-light-theme .more-events {
        font-size: 9px;
        text-align: center;
        padding: 2px 6px;
        font-weight: 400;
        border-radius: 10px;
        margin-top: 2px;
        backdrop-filter: blur(5px);
      }

      .calendar-container.google-dark-theme .more-events {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(0, 0, 0, 0.2);
      }

      .calendar-container.google-light-theme .more-events {
        color: rgba(0, 0, 0, 0.6);
        background: rgba(255, 255, 255, 0.8);
      }

      .calendar-container.google-dark-theme .daily-event,
      .calendar-container.google-light-theme .daily-event {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-left: 4px solid #4285f4 !important;
        border-radius: 12px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .calendar-container.google-dark-theme .daily-event:hover,
      .calendar-container.google-light-theme .daily-event:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateX(8px);
        box-shadow: 0 4px 16px rgba(66, 133, 244, 0.2);
      }

      .calendar-container.google-dark-theme .event-title {
        color: #ffffff;
        font-weight: 500;
      }

      .calendar-container.google-light-theme .event-title {
        color: #202124;
        font-weight: 500;
      }

      .calendar-container.google-dark-theme .event-time {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
      }

      .calendar-container.google-light-theme .event-time {
        color: rgba(32, 33, 36, 0.8);
        font-weight: 400;
      }

      .calendar-container.google-dark-theme .week-event,
      .calendar-container.google-light-theme .week-event {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%) !important;
        border: none;
        border-radius: 8px;
        color: #ffffff;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .calendar-container.google-dark-theme .week-event:hover,
      .calendar-container.google-light-theme .week-event:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      }

      /* ========================================
         POPUP TEMI GOOGLE CALENDAR - UNIFICATI
         ======================================== */

      .calendar-popup-overlay.google-dark-theme,
      .calendar-popup-overlay.google-light-theme {
        backdrop-filter: blur(20px);
      }

      .calendar-popup-overlay.google-dark-theme {
        background: rgba(32, 33, 36, 0.9);
      }

      .calendar-popup-overlay.google-light-theme {
        background: rgba(248, 251, 255, 0.9);
      }

      .calendar-popup-overlay.google-dark-theme .popup-container,
      .calendar-popup-overlay.google-light-theme .popup-container {
        border-radius: 16px;
        overflow: hidden;
      }

      .calendar-popup-overlay.google-dark-theme .popup-container {
        background: #202124;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(66, 133, 244, 0.2);
      }

      .calendar-popup-overlay.google-light-theme .popup-container {
        background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        border: 1px solid rgba(218, 220, 224, 0.6);
        box-shadow:
          0 8px 32px rgba(60, 64, 67, 0.15),
          0 0 60px rgba(66, 133, 244, 0.1);
      }

      .calendar-popup-overlay.google-dark-theme .popup-side,
      .calendar-popup-overlay.google-light-theme .popup-side {
        backdrop-filter: blur(10px);
      }

      .calendar-popup-overlay.google-dark-theme .popup-side {
        background: rgba(255, 255, 255, 0.05);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.google-light-theme .popup-side {
        background: rgba(66, 133, 244, 0.03);
        border-right: 1px solid rgba(218, 220, 224, 0.4);
      }

      .calendar-popup-overlay.google-dark-theme .popup-side:first-child {
        border-right: 1px solid rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.google-light-theme .popup-side:first-child {
        border-right: 1px solid rgba(218, 220, 224, 0.4);
      }

      .calendar-popup-overlay.google-dark-theme .popup-title,
      .calendar-popup-overlay.google-light-theme .popup-title {
        font-weight: 500;
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .calendar-popup-overlay.google-dark-theme .popup-title {
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.google-light-theme .popup-title {
        color: #202124;
        border-bottom: 1px solid rgba(218, 220, 224, 0.4);
      }

      .calendar-popup-overlay.google-dark-theme .form-group label,
      .calendar-popup-overlay.google-light-theme .form-group label {
        font-weight: 500;
      }

      .calendar-popup-overlay.google-dark-theme .form-group label {
        color: #e8eaed;
      }

      .calendar-popup-overlay.google-light-theme .form-group label {
        color: #202124;
      }

      .calendar-popup-overlay.google-dark-theme .form-group input,
      .calendar-popup-overlay.google-dark-theme .form-group textarea,
      .calendar-popup-overlay.google-dark-theme .form-group select,
      .calendar-popup-overlay.google-light-theme .form-group input,
      .calendar-popup-overlay.google-light-theme .form-group textarea,
      .calendar-popup-overlay.google-light-theme .form-group select {
        border-radius: 8px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .calendar-popup-overlay.google-dark-theme .form-group input,
      .calendar-popup-overlay.google-dark-theme .form-group textarea,
      .calendar-popup-overlay.google-dark-theme .form-group select {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .calendar-popup-overlay.google-light-theme .form-group input,
      .calendar-popup-overlay.google-light-theme .form-group textarea,
      .calendar-popup-overlay.google-light-theme .form-group select {
        background: rgba(255, 255, 255, 0.8);
        color: #202124;
        border: 1px solid rgba(218, 220, 224, 0.6);
      }

      .calendar-popup-overlay.google-dark-theme .form-group input:focus,
      .calendar-popup-overlay.google-dark-theme .form-group textarea:focus,
      .calendar-popup-overlay.google-dark-theme .form-group select:focus {
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
        background: rgba(255, 255, 255, 0.15);
      }

      .calendar-popup-overlay.google-light-theme .form-group input:focus,
      .calendar-popup-overlay.google-light-theme .form-group textarea:focus,
      .calendar-popup-overlay.google-light-theme .form-group select:focus {
        outline: none;
        border-color: #4285f4;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1), 0 2px 15px rgba(0, 0, 0, 0.1);
      }

      /* Stili per i campi date degli eventi tutto il giorno */
      .calendar-popup-overlay .event-start-date,
      .calendar-popup-overlay .event-end-date {
        padding: 12px 16px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 212, 255, 0.05));
        color: #ffffff;
        font-size: 14px;
        font-family: 'Roboto', sans-serif;
        transition: all 0.3s ease;
        box-shadow:
          0 2px 10px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        width: 100%;
        box-sizing: border-box;
      }

      .calendar-popup-overlay.light-theme .event-start-date,
      .calendar-popup-overlay.light-theme .event-end-date {
        border: 1px solid rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(59, 130, 246, 0.05));
        color: #1a202c;
      }

      .calendar-popup-overlay .event-start-date:focus,
      .calendar-popup-overlay .event-end-date:focus {
        outline: none;
        border-color: rgba(0, 212, 255, 0.8);
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 212, 255, 0.1));
        box-shadow:
          0 0 0 3px rgba(0, 212, 255, 0.2),
          0 4px 20px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .calendar-popup-overlay.light-theme .event-start-date:focus,
      .calendar-popup-overlay.light-theme .event-end-date:focus {
        border-color: rgba(59, 130, 246, 0.8);
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay.google-dark-theme .event-item,
      .calendar-popup-overlay.google-light-theme .event-item {
        border-left: 4px solid #4285f4;
        border-radius: 8px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .calendar-popup-overlay.google-dark-theme .event-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.google-light-theme .event-item {
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(218, 220, 224, 0.4);
      }

      .calendar-popup-overlay.google-dark-theme .event-item:hover,
      .calendar-popup-overlay.google-light-theme .event-item:hover {
        transform: translateX(4px);
      }

      .calendar-popup-overlay.google-dark-theme .event-item:hover {
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 16px rgba(66, 133, 244, 0.2);
      }

      .calendar-popup-overlay.google-light-theme .event-item:hover {
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 4px 16px rgba(66, 133, 244, 0.15);
      }

      .calendar-popup-overlay.google-dark-theme .event-item-title,
      .calendar-popup-overlay.google-light-theme .event-item-title {
        font-weight: 500;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-title {
        color: #ffffff;
      }

      .calendar-popup-overlay.google-light-theme .event-item-title {
        color: #202124;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-time {
        color: rgba(255, 255, 255, 0.8);
      }

      .calendar-popup-overlay.google-light-theme .event-item-time {
        color: rgba(32, 33, 36, 0.8);
      }

      .calendar-popup-overlay.google-dark-theme .event-item-description {
        color: rgba(255, 255, 255, 0.7);
      }

      .calendar-popup-overlay.google-light-theme .event-item-description {
        color: rgba(32, 33, 36, 0.7);
      }

      .calendar-popup-overlay.google-light-theme .event-item-delete,
      .calendar-popup-overlay.google-light-theme .event-item-notifications {
        border-radius: 6px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-edit,
      .calendar-popup-overlay.google-dark-theme .event-item-delete,
      .calendar-popup-overlay.google-dark-theme .event-item-notifications {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .calendar-popup-overlay.google-light-theme .event-item-edit,
      .calendar-popup-overlay.google-light-theme .event-item-delete,
      .calendar-popup-overlay.google-light-theme .event-item-notifications {
        background: rgba(66, 133, 244, 0.1);
        border: 1px solid rgba(66, 133, 244, 0.2);
      }

      .calendar-popup-overlay.google-dark-theme .event-item-edit,
      .calendar-popup-overlay.google-light-theme .event-item-edit {
        color: #4285f4;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-delete,
      .calendar-popup-overlay.google-light-theme .event-item-delete {
        color: #ea4335;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-notifications,
      .calendar-popup-overlay.google-light-theme .event-item-notifications {
        color: #34a853;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-edit:hover {
        background: rgba(66, 133, 244, 0.2);
        border-color: #4285f4;
      }

      .calendar-popup-overlay.google-light-theme .event-item-edit:hover {
        background: rgba(66, 133, 244, 0.2);
        border-color: #4285f4;
      }

      .calendar-popup-overlay.google-dark-theme .event-item-notifications:hover {
        background: rgba(52, 168, 83, 0.2);
        border-color: #34a853;
      }

      .calendar-popup-overlay.google-light-theme .event-item-delete:hover {
        background: rgba(234, 67, 53, 0.1);
        border-color: #ea4335;
      }

      .calendar-popup-overlay.google-light-theme .event-item-notifications:hover {
        background: rgba(52, 168, 83, 0.1);
        border-color: #34a853;
      }

      /* EVENTI GIALLI quando hanno notifiche nei temi Google */
      .calendar-popup-overlay.google-dark-theme .event-item.has-notifications {
        background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
        border-left: 4px solid #f59e0b !important;
        color: #1a202c !important;
        animation: yellowEventGlow 2s ease-in-out infinite;
      }

      .calendar-popup-overlay.google-light-theme .event-item.has-notifications {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        border-left: 4px solid #d97706 !important;
        color: #1a202c !important;
        animation: yellowEventGlow 2s ease-in-out infinite;
      }

      .calendar-popup-overlay.google-dark-theme .event-item.has-notifications .event-item-title,
      .calendar-popup-overlay.google-light-theme .event-item.has-notifications .event-item-title {
        color: #1a202c !important;
        font-weight: 700 !important;
      }

      .calendar-popup-overlay.google-dark-theme .event-item.has-notifications .event-item-time,
      .calendar-popup-overlay.google-light-theme .event-item.has-notifications .event-item-time {
        color: rgba(26, 32, 44, 0.8) !important;
      }

      .calendar-popup-overlay.google-dark-theme .event-item.has-notifications .event-item-description,
      .calendar-popup-overlay.google-light-theme .event-item.has-notifications .event-item-description {
        color: rgba(26, 32, 44, 0.7) !important;
      }

      .calendar-popup-overlay.google-dark-theme .event-item.has-notifications:hover,
      .calendar-popup-overlay.google-light-theme .event-item.has-notifications:hover {
        background: linear-gradient(135deg, #fcd34d, #fbbf24) !important;
        box-shadow: 0 4px 16px rgba(251, 191, 36, 0.4) !important;
        transform: translateX(8px) !important;
      }

      @keyframes yellowEventGlow {
        0%, 100% {
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }
      }

      /* EVENTI GIALLI nei temi Google - TUTTI I CONTESTI */
      .calendar-container.google-dark-theme .event-item.has-notifications,
      .calendar-container.google-light-theme .event-item.has-notifications {
        background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
        color: #1a202c !important;
        border: 2px solid #f59e0b !important;
        border-radius: 8px !important;
        animation: yellowEventGlow 2s ease-in-out infinite;
        font-weight: 700 !important;
        transform: scale(1.02) !important;
        box-shadow: 0 4px 16px rgba(251, 191, 36, 0.4) !important;
      }

      .calendar-container.google-dark-theme .event-item.has-notifications .event-item-title,
      .calendar-container.google-light-theme .event-item.has-notifications .event-item-title {
        color: #1a202c !important;
        font-weight: 700 !important;
      }

      .calendar-container.google-dark-theme .event-item.has-notifications .event-item-time,
      .calendar-container.google-light-theme .event-item.has-notifications .event-item-time {
        color: rgba(26, 32, 44, 0.8) !important;
      }

      .calendar-container.google-dark-theme .event-item.has-notifications .event-item-description,
      .calendar-container.google-light-theme .event-item.has-notifications .event-item-description {
        color: rgba(26, 32, 44, 0.7) !important;
      }

      .calendar-container.google-dark-theme .event-item.has-notifications:hover,
      .calendar-container.google-light-theme .event-item.has-notifications:hover {
        background: linear-gradient(135deg, #fcd34d, #fbbf24) !important;
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.6) !important;
        transform: scale(1.05) !important;
      }

      /* EVENTI DEL CALENDARIO MENSILE GIALLI quando hanno notifiche */
      .calendar-container.google-dark-theme .day-event.has-notifications,
      .calendar-container.google-light-theme .day-event.has-notifications {
        background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
        color: #1a202c !important;
        font-weight: 700 !important;
        border: 2px solid #f59e0b !important;
        border-radius: 4px !important;
        animation: yellowEventGlow 2s ease-in-out infinite !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4) !important;
        transform: scale(1.02) !important;
      }

      .calendar-container.google-dark-theme .day-event.has-notifications:hover,
      .calendar-container.google-light-theme .day-event.has-notifications:hover {
        background: linear-gradient(135deg, #fcd34d, #fbbf24) !important;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.6) !important;
        transform: scale(1.05) !important;
      }

      /* Popup Notifiche Google Dark */
      .notifications-popup-overlay.google-dark-theme {
        background: rgba(32, 33, 36, 0.9);
        backdrop-filter: blur(20px);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-popup {
        background: linear-gradient(135deg, #202124 0%, #292a2d 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(66, 133, 244, 0.2);
        color: #ffffff;
      }

      .notifications-popup-overlay.google-dark-theme .notifications-title {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-close {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }

      .notifications-popup-overlay.google-dark-theme .form-group label {
        color: #e8eaed;
      }

      .notifications-popup-overlay.google-dark-theme .form-group input,
      .notifications-popup-overlay.google-dark-theme .form-group select,
      .notifications-popup-overlay.google-dark-theme .form-group textarea {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-dark-theme .form-group input:focus,
      .notifications-popup-overlay.google-dark-theme .form-group select:focus,
      .notifications-popup-overlay.google-dark-theme .form-group textarea:focus {
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
      }

      /* Popup Notifiche Google Light */
      .notifications-popup-overlay.google-light-theme {
        background: rgba(248, 251, 255, 0.9);
        backdrop-filter: blur(20px);
      }

      .notifications-popup-overlay.google-light-theme .notifications-popup {
        background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        border: 1px solid rgba(218, 220, 224, 0.6);
        border-radius: 16px;
        box-shadow:
          0 8px 32px rgba(60, 64, 67, 0.15),
          0 0 60px rgba(66, 133, 244, 0.1);
        color: #202124;
      }

      .notifications-popup-overlay.google-light-theme .notifications-title {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        border-bottom: 1px solid rgba(218, 220, 224, 0.4);
      }

      .notifications-popup-overlay.google-light-theme .notifications-close {
        background: rgba(66, 133, 244, 0.1);
        color: #4285f4;
        border: 1px solid rgba(66, 133, 244, 0.2);
        border-radius: 50%;
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-light-theme .notifications-close:hover {
        background: rgba(66, 133, 244, 0.2);
        transform: scale(1.1);
      }

      .notifications-popup-overlay.google-light-theme .form-group label {
        color: #202124;
      }

      .notifications-popup-overlay.google-light-theme .form-group input,
      .notifications-popup-overlay.google-light-theme .form-group select,
      .notifications-popup-overlay.google-light-theme .form-group textarea {
        background: rgba(255, 255, 255, 0.8);
        color: #202124;
        border: 1px solid rgba(218, 220, 224, 0.6);
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-light-theme .form-group input:focus,
      .notifications-popup-overlay.google-light-theme .form-group select:focus,
      .notifications-popup-overlay.google-light-theme .form-group textarea:focus {
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        background: rgba(255, 255, 255, 1);
      }

      /* ==== TEMATIZZAZIONE POPUP CORRETTA - TUTTI I TIPI ==== */

      /* GOOGLE DARK THEME - Elementi notifiche (TUTTI I POPUP) */
      .notifications-popup-overlay.google-dark-theme .notification-item,
      .calendar-popup-overlay.google-dark-theme .notification-item,
      .config-popup-overlay.google-dark-theme .notification-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-dark-theme .notification-device,
      .calendar-popup-overlay.google-dark-theme .notification-device { color: rgba(255, 255, 255, 0.5); }

      .notifications-popup-overlay.google-dark-theme .notification-status,
      .calendar-popup-overlay.google-dark-theme .notification-status { color: #ea4335; font-weight: bold; }

      .notifications-popup-overlay.google-dark-theme .notification-remove,
      .calendar-popup-overlay.google-dark-theme .notification-remove {
        background: rgba(234, 67, 53, 0.2);
        border: 1px solid rgba(234, 67, 53, 0.4);
        color: #ea4335;
      }

      .notifications-popup-overlay.google-dark-theme .notification-remove:hover,
      .calendar-popup-overlay.google-dark-theme .notification-remove:hover {
        background: rgba(234, 67, 53, 0.4);
        transform: scale(1.1);
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-btn,
      .calendar-popup-overlay.google-dark-theme .add-notification-btn {
        background: linear-gradient(135deg, #4285f4, #1a73e8);
        border: 1px solid #4285f4;
        color: #ffffff;
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-btn:hover,
      .calendar-popup-overlay.google-dark-theme .add-notification-btn:hover {
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4);
      }

      /* GOOGLE LIGHT THEME - Elementi notifiche (TUTTI I POPUP) */
      .notifications-popup-overlay.google-light-theme .notification-item,
      .calendar-popup-overlay.google-light-theme .notification-item,
      .config-popup-overlay.google-light-theme .notification-item {
        background: rgba(66, 133, 244, 0.05);
        border: 1px solid rgba(66, 133, 244, 0.15);
        backdrop-filter: blur(10px);
      }

      .notifications-popup-overlay.google-light-theme .notification-type,
      .calendar-popup-overlay.google-light-theme .notification-type { color: #1a73e8; }

      .notifications-popup-overlay.google-light-theme .notification-timing,
      .calendar-popup-overlay.google-light-theme .notification-timing { color: #5f6368; }

      .notifications-popup-overlay.google-light-theme .notification-device,
      .calendar-popup-overlay.google-light-theme .notification-device { color: #80868b; }

      .notifications-popup-overlay.google-light-theme .notification-status,
      .calendar-popup-overlay.google-light-theme .notification-status { color: #d93025; font-weight: bold; }

      .notifications-popup-overlay.google-light-theme .notification-remove,
      .calendar-popup-overlay.google-light-theme .notification-remove {
        background: rgba(234, 67, 53, 0.1);
        border: 1px solid rgba(234, 67, 53, 0.2);
        color: #d93025;
      }

      .notifications-popup-overlay.google-light-theme .notification-remove:hover,
      .calendar-popup-overlay.google-light-theme .notification-remove:hover {
        background: rgba(234, 67, 53, 0.2);
        transform: scale(1.1);
      }

      .notifications-popup-overlay.google-light-theme .add-notification-btn,
      .calendar-popup-overlay.google-light-theme .add-notification-btn {
        background: linear-gradient(135deg, #4285f4, #1a73e8);
        border: 1px solid #4285f4;
        color: #ffffff;
      }

      .notifications-popup-overlay.google-light-theme .add-notification-btn:hover,
      .calendar-popup-overlay.google-light-theme .add-notification-btn:hover {
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
      }

      /* Sezioni e bordi comuni */
      .notifications-popup-overlay.google-dark-theme .add-notification-section,
      .notifications-popup-overlay.google-dark-theme .custom-message-section,
      .calendar-popup-overlay.google-dark-theme .add-notification-section,
      .calendar-popup-overlay.google-dark-theme .custom-message-section {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .notifications-popup-overlay.google-light-theme .add-notification-section,
      .notifications-popup-overlay.google-light-theme .custom-message-section,
      .calendar-popup-overlay.google-light-theme .add-notification-section,
      .calendar-popup-overlay.google-light-theme .custom-message-section {
        border-top: 1px solid rgba(218, 220, 224, 0.5);
      }

      /* Labels comuni per tutti i popup Google */
      .notifications-popup-overlay.google-dark-theme .form-row label,
      .notifications-popup-overlay.google-dark-theme .add-notification-section h4,
      .notifications-popup-overlay.google-dark-theme .existing-notifications h4,
      .notifications-popup-overlay.google-dark-theme .no-notifications { color: #ffffff; }

      .notifications-popup-overlay.google-light-theme .form-row label,
      .notifications-popup-overlay.google-light-theme .add-notification-section h4,
      .notifications-popup-overlay.google-light-theme .existing-notifications h4 { color: #3c4043; }

      .notifications-popup-overlay.google-light-theme .no-notifications { color: #80868b; }

      .notifications-popup-overlay.google-light-theme .form-row select {
        border: 1px solid #dadce0;
        background: #ffffff;
        color: #3c4043;
      }

      /* Placeholder e input personalizzati */
      .notifications-popup-overlay.google-dark-theme .custom-message-push-input::placeholder,
      .notifications-popup-overlay.google-dark-theme .custom-message-alexa-input::placeholder,
      .calendar-popup-overlay.google-dark-theme .custom-message-push-input::placeholder,
      .calendar-popup-overlay.google-dark-theme .custom-message-alexa-input::placeholder {
        color: rgba(255, 255, 255, 0.4); font-style: italic;
      }

      .notifications-popup-overlay.google-light-theme .custom-message-push-input::placeholder,
      .notifications-popup-overlay.google-light-theme .custom-message-alexa-input::placeholder,
      .calendar-popup-overlay.google-light-theme .custom-message-push-input::placeholder,
      .calendar-popup-overlay.google-light-theme .custom-message-alexa-input::placeholder {
        color: rgba(128, 134, 139, 0.6); font-style: italic;
      }

      .notifications-popup-overlay.google-dark-theme .custom-timing-value,
      .calendar-popup-overlay.google-dark-theme .custom-timing-value {
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        background: rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
      }

      .notifications-popup-overlay.google-light-theme .custom-timing-value,
      .calendar-popup-overlay.google-light-theme .custom-timing-value {
        border: 1px solid #dadce0 !important;
        background: #ffffff !important;
        color: #3c4043 !important;
      }

      /* Config Popup Google - Unificato */
      .config-popup-overlay.google-dark-theme,
      .config-popup-overlay.google-light-theme {
        backdrop-filter: blur(20px);
      }

      .config-popup-overlay.google-dark-theme {
        background: rgba(32, 33, 36, 0.9);
      }

      .config-popup-overlay.google-light-theme {
        background: rgba(248, 251, 255, 0.9);
      }

      .config-popup-overlay.google-dark-theme .config-popup,
      .config-popup-overlay.google-light-theme .config-popup {
        border-radius: 16px;
      }

      .config-popup-overlay.google-dark-theme .config-popup {
        background: linear-gradient(135deg, #202124 0%, #292a2d 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(66, 133, 244, 0.2);
        color: #ffffff;
      }

      .config-popup-overlay.google-light-theme .config-popup {
        background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        border: 1px solid rgba(218, 220, 224, 0.6);
        box-shadow:
          0 8px 32px rgba(60, 64, 67, 0.15),
          0 0 60px rgba(66, 133, 244, 0.1);
        color: #202124;
      }

      .config-popup-overlay.google-dark-theme .config-header,
      .config-popup-overlay.google-light-theme .config-header {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
      }

      .config-popup-overlay.google-dark-theme .config-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .config-popup-overlay.google-light-theme .config-header {
        border-bottom: 1px solid rgba(218, 220, 224, 0.4);
      }

      .config-popup-overlay.google-dark-theme .config-close-button,
      .config-popup-overlay.google-light-theme .config-close-button {
        border-radius: 50%;
        backdrop-filter: blur(10px);
      }

      .config-popup-overlay.google-dark-theme .config-close-button {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .config-popup-overlay.google-light-theme .config-close-button {
        background: rgba(66, 133, 244, 0.1);
        color: #4285f4;
        border: 1px solid rgba(66, 133, 244, 0.2);
      }

      .config-popup-overlay.google-dark-theme .config-close-button:hover,
      .config-popup-overlay.google-light-theme .config-close-button:hover {
        transform: scale(1.1);
      }

      .config-popup-overlay.google-dark-theme .config-close-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .config-popup-overlay.google-light-theme .config-close-button:hover {
        background: rgba(66, 133, 244, 0.2);
      }

      .config-popup-overlay.google-dark-theme .config-section h3,
      .config-popup-overlay.google-dark-theme .config-section label {
        color: #ffffff;
      }

      .config-popup-overlay.google-light-theme .config-section h3,
      .config-popup-overlay.google-light-theme .config-section label {
        color: #202124;
      }

      .config-popup-overlay.google-dark-theme .config-section label {
        color: #e8eaed;
      }

      .config-popup-overlay.google-dark-theme .config-section input,
      .config-popup-overlay.google-dark-theme .config-section select,
      .config-popup-overlay.google-light-theme .config-section input,
      .config-popup-overlay.google-light-theme .config-section select {
        backdrop-filter: blur(10px);
      }

      .config-popup-overlay.google-dark-theme .config-section input,
      .config-popup-overlay.google-dark-theme .config-section select {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .config-popup-overlay.google-light-theme .config-section input,
      .config-popup-overlay.google-light-theme .config-section select {
        background: rgba(255, 255, 255, 0.8);
        color: #202124;
        border: 1px solid rgba(218, 220, 224, 0.6);
      }

      .config-popup-overlay.google-dark-theme .config-section input:focus,
      .config-popup-overlay.google-dark-theme .config-section select:focus {
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
      }

      .config-popup-overlay.google-light-theme .config-section input:focus,
      .config-popup-overlay.google-light-theme .config-section select:focus {
        border-color: #4285f4;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        background: rgba(255, 255, 255, 1);
      }

      /* Pulsanti config consolidati */
      /* ==== CONFIG POPUP CORRETTO - CLASSI SPECIFICHE ==== */

      .config-popup-overlay.google-dark-theme .config-actions {
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        background: rgba(32, 33, 36, 0.8) !important;
      }

      .config-popup-overlay.google-light-theme .config-actions {
        border-top: 1px solid rgba(218, 220, 224, 0.5) !important;
        background: rgba(248, 251, 255, 0.8) !important;
      }

      .config-popup-overlay.google-dark-theme .config-save-button,
      .config-popup-overlay.google-light-theme .config-save-button {
        background: linear-gradient(135deg, #4285f4, #1a73e8) !important;
        border: 1px solid #4285f4 !important;
        color: #ffffff !important;
        text-shadow: none !important;
      }

      .config-popup-overlay.google-dark-theme .config-save-button:hover,
      .config-popup-overlay.google-light-theme .config-save-button:hover {
        background: linear-gradient(135deg, #5a95f5, #2b7de9) !important;
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4) !important;
        transform: translateY(-2px) !important;
      }

      .config-popup-overlay.google-dark-theme .config-cancel-button {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #ffffff !important;
        text-shadow: none !important;
      }

      .config-popup-overlay.google-light-theme .config-cancel-button {
        background: rgba(95, 99, 104, 0.1) !important;
        border: 1px solid rgba(95, 99, 104, 0.3) !important;
        color: #5f6368 !important;
        text-shadow: none !important;
      }

      .config-popup-overlay.google-dark-theme .config-cancel-button:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1) !important;
        transform: translateY(-2px) !important;
      }

      .config-popup-overlay.google-light-theme .config-cancel-button:hover {
        background: rgba(95, 99, 104, 0.2) !important;
        box-shadow: 0 4px 15px rgba(95, 99, 104, 0.2) !important;
        transform: translateY(-2px) !important;
      }

      /* Config sections */
      .config-popup-overlay.google-dark-theme .config-section {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }

      .config-popup-overlay.google-light-theme .config-section {
        background: rgba(255, 255, 255, 0.8) !important;
        border: 1px solid rgba(218, 220, 224, 0.6) !important;
      }

      /* Config labels */
      .config-popup-overlay.google-dark-theme .config-label {
        color: #ffffff !important;
        text-shadow: none !important;
      }

      .config-popup-overlay.google-light-theme .config-label {
        color: #3c4043 !important;
        text-shadow: none !important;
      }

      /* Multi-select options corretti */
      .config-popup-overlay.google-dark-theme .multi-select-option {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
      }

      .config-popup-overlay.google-light-theme .multi-select-option {
        background: rgba(255, 255, 255, 0.8) !important;
        border: 1px solid rgba(218, 220, 224, 0.6) !important;
        color: #3c4043 !important;
      }

      .config-popup-overlay.google-dark-theme .multi-select-option:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(66, 133, 244, 0.3) !important;
      }

      .config-popup-overlay.google-light-theme .multi-select-option:hover {
        background: rgba(248, 251, 255, 1) !important;
        border-color: rgba(66, 133, 244, 0.4) !important;
      }

      .config-popup-overlay.google-dark-theme .multi-select-option input[type="checkbox"]:checked,
      .config-popup-overlay.google-light-theme .multi-select-option input[type="checkbox"]:checked {
        background: #4285f4 !important;
        border-color: #4285f4 !important;
      }

      /* ========================================
         LAYOUT HEADER GOOGLE - FRECCE SEPARATE
         ======================================== */

      /* Header Google - Layout a Due Righe */
      .calendar-container.google-dark-theme .header.google-header,
      .calendar-container.google-light-theme .header.google-header {
        padding: 12px 16px;
        background: none;
        border: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Prima Riga: Frecce + Titolo */
      .calendar-container.google-dark-theme .google-header-row,
      .calendar-container.google-light-theme .google-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      /* Container Titolo Centrato */
      .calendar-container.google-dark-theme .google-title-container,
      .calendar-container.google-light-theme .google-title-container {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      /* Titolo Google */
      .calendar-container.google-dark-theme .month-title.google-title,
      .calendar-container.google-light-theme .month-title.google-title {
        font-size: 16px;
        font-weight: 500;
        margin: 0;
        text-align: center;
      }

      .calendar-container.google-dark-theme .month-title.google-title {
        background: linear-gradient(135deg, #ffffff 0%, #e8eaed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .calendar-container.google-light-theme .month-title.google-title {
        color: #202124;
      }

      /* Frecce Google */
      .calendar-container.google-dark-theme .nav-button.google-nav,
      .calendar-container.google-light-theme .nav-button.google-nav {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
      }

      .calendar-container.google-dark-theme .nav-button.google-nav {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }

      .calendar-container.google-light-theme .nav-button.google-nav {
        background: rgba(66, 133, 244, 0.1);
        color: #4285f4;
        border: 1px solid rgba(66, 133, 244, 0.2);
      }

      .calendar-container.google-dark-theme .nav-button.google-nav:hover,
      .calendar-container.google-light-theme .nav-button.google-nav:hover {
        transform: scale(1.1) rotate(-2deg);
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      }

      .calendar-container.google-dark-theme .nav-button.google-nav:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: #ffffff;
      }

      .calendar-container.google-light-theme .nav-button.google-nav:hover {
        background: rgba(66, 133, 244, 0.2);
        border-color: #4285f4;
      }

      /* Seconda Riga: Controlli + Sync */
      .calendar-container.google-dark-theme .google-controls-row,
      .calendar-container.google-light-theme .google-controls-row {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }

      /* Bottoni Vista Google */
      .calendar-container.google-dark-theme .view-buttons.google-view-buttons,
      .calendar-container.google-light-theme .view-buttons.google-view-buttons {
        display: flex;
        gap: 4px;
        background: none;
        border: none;
        border-radius: 0;
        padding: 0;
      }

      .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button,
      .calendar-container.google-light-theme .view-buttons.google-view-buttons .view-button {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .calendar-container.google-light-theme .view-buttons.google-view-buttons .view-button {
        background: rgba(66, 133, 244, 0.1);
        color: rgba(66, 133, 244, 0.8);
        border: 1px solid rgba(66, 133, 244, 0.2);
      }

      .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button.active,
      .calendar-container.google-light-theme .view-buttons.google-view-buttons .view-button.active {
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
      }

      .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button.active {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        color: #ffffff;
        border-color: transparent;
      }

      .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button:hover,
      .calendar-container.google-light-theme .view-buttons.google-view-buttons .view-button:hover {
        transform: scale(1.1);
      }

      /* Bottone Sync Google */
      .calendar-container.google-dark-theme .sync-button,
      .calendar-container.google-light-theme .sync-button {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
      }

      .calendar-container.google-dark-theme .sync-button {
        background: rgba(52, 168, 83, 0.2);
        color: #34a853;
        border: 1px solid rgba(52, 168, 83, 0.3);
      }

      .calendar-container.google-light-theme .sync-button {
        background: rgba(52, 168, 83, 0.1);
        color: #34a853;
        border: 1px solid rgba(52, 168, 83, 0.2);
      }

      .calendar-container.google-dark-theme .sync-button:hover,
      .calendar-container.google-light-theme .sync-button:hover {
        transform: scale(1.1) rotate(90deg);
        background: rgba(52, 168, 83, 0.3);
        border-color: #34a853;
        box-shadow: 0 4px 12px rgba(52, 168, 83, 0.3);
      }

      .calendar-container.google-dark-theme .sync-button.syncing,
      .calendar-container.google-light-theme .sync-button.syncing {
        animation: spin 1s linear infinite;
        background: rgba(251, 188, 5, 0.2);
        color: #fbbc05;
        border-color: rgba(251, 188, 5, 0.3);
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Responsive per Header Google */
      @media (max-width: 768px) {
        .calendar-container.google-dark-theme .header.google-header,
        .calendar-container.google-light-theme .header.google-header {
          padding: 8px 12px;
          gap: 6px;
        }

        .calendar-container.google-dark-theme .month-title.google-title,
        .calendar-container.google-light-theme .month-title.google-title {
          font-size: 14px;
        }

        .calendar-container.google-dark-theme .nav-button.google-nav,
        .calendar-container.google-light-theme .nav-button.google-nav {
          width: 32px;
          height: 32px;
          font-size: 16px;
        }

        .calendar-container.google-dark-theme .view-buttons.google-view-buttons .view-button,
        .calendar-container.google-light-theme .view-buttons.google-view-buttons .view-button {
          width: 32px;
          height: 32px;
          font-size: 11px;
        }

        .calendar-container.google-dark-theme .sync-button,
        .calendar-container.google-light-theme .sync-button {
          width: 32px;
          height: 32px;
        }
      }

      /* ========================================
         CARD PIÙ LARGA PER TEMI GOOGLE
         ======================================== */

      /* Giorni ottimizzati per contenere eventi */
      .calendar-container.google-dark-theme .day,
      .calendar-container.google-light-theme .day {
        min-height: 60px;
        padding: 6px;
        border-radius: 12px !important;
      }

      /* Eventi non sovrapposti */
      .calendar-container.google-dark-theme .day-events,
      .calendar-container.google-light-theme .day-events {
        max-height: 80px;
        overflow: hidden;
        gap: 1px;
      }

      .calendar-container.google-dark-theme .day-event,
      .calendar-container.google-light-theme .day-event {
        font-size: 9px;
        padding: 2px 6px;
        margin-bottom: 1px;
        line-height: 1.2;
      }

      /* Testo più leggibile */
      .calendar-container.google-dark-theme .day-event {
        background: rgba(66, 133, 244, 0.9);
        color: #ffffff;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .calendar-container.google-light-theme .day-event {
        background: rgba(66, 133, 244, 0.9);
        color: #ffffff;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      /* Eventi alternati con colori diversi per distinguerli */
      .calendar-container.google-dark-theme .day-event:nth-child(2n),
      .calendar-container.google-light-theme .day-event:nth-child(2n) {
        background: rgba(52, 168, 83, 0.9);
      }

      .calendar-container.google-dark-theme .day-event:nth-child(3n),
      .calendar-container.google-light-theme .day-event:nth-child(3n) {
        background: rgba(251, 188, 5, 0.9);
        color: #000000;
        text-shadow: none;
      }

      .calendar-container.google-dark-theme .day-event:nth-child(4n),
      .calendar-container.google-light-theme .day-event:nth-child(4n) {
        background: rgba(234, 67, 53, 0.9);
        color: #ffffff;
      }

      /* Stili per eventi multi-giorno */
      .multi-day-event {
        position: relative;
        font-weight: 700 !important;
        border: 1px solid rgba(255, 255, 255, 0.4) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .event-start {
        border-top-right-radius: 2px !important;
        border-bottom-right-radius: 2px !important;
        margin-right: 0 !important;
        border-right: 2px solid rgba(255, 255, 255, 0.6) !important;
      }

      .event-middle {
        border-radius: 2px !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        border-left: 2px solid rgba(255, 255, 255, 0.6) !important;
        border-right: 2px solid rgba(255, 255, 255, 0.6) !important;
      }

      .event-end {
        border-top-left-radius: 2px !important;
        border-bottom-left-radius: 2px !important;
        margin-left: 0 !important;
        border-left: 2px solid rgba(255, 255, 255, 0.6) !important;
      }

      /* Numero del giorno più visibile */
      .calendar-container.google-dark-theme .day-number {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
        z-index: 10;
        position: relative;
      }

      /* Numero del giorno weekend per tema scuro Google */
      .calendar-container.google-dark-theme .day.weekend .day-number {
        color: #ff5555 !important;
        font-weight: 700;
      }
      /* Container mobile più compatto */
      .calendar-container.google-dark-theme,
      .calendar-container.google-light-theme {
        font-size: 14px;
      }

      /* Google Mobile - Layout Unificato */
      .calendar-container.google-dark-theme .day,
      .calendar-container.google-light-theme .day {
        min-height: 70px !important;
        padding: 3px !important;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .calendar-container.google-dark-theme .day-number {
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 4px;
          z-index: 20;
          position: relative;
          /* background: rgba(0, 0, 0, 0.7); */
          color: #ffffff;
          padding: 0 6px;
          border-radius: 6px;
          display: inline-block;
          min-width: 10px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .calendar-container.google-light-theme .day-number {
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 4px;
          z-index: 20;
          position: relative;
          /* background: rgba(0, 0, 0, 0.7); */
          color: black;
          padding: 0 6px;
          border-radius: 6px;
          display: inline-block;
          min-width: 10px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      .calendar-container.google-dark-theme .day-events,
      .calendar-container.google-light-theme .day-events {
        max-height: 45px !important;
        overflow: hidden;
        gap: 1px;
        display: flex;
        flex-direction: column;
      }

      .calendar-container.google-dark-theme .day-event,
      .calendar-container.google-light-theme .day-event {
        font-size: 9px;
        padding: 2px 4px;
        margin-bottom: 1px;
        line-height: 1.3;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        display: block;
        background: rgba(66, 133, 244, 0.95) !important;
        color: #ffffff !important;
      }

      .calendar-container.google-dark-theme .day-event {
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .calendar-container.google-light-theme .day-event {
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .calendar-container.google-dark-theme .day-event:nth-child(2n),
      .calendar-container.google-light-theme .day-event:nth-child(2n) {
        background: rgba(52, 168, 83, 0.95) !important;
      }

      .calendar-container.google-dark-theme .day-event:nth-child(3n),
      .calendar-container.google-light-theme .day-event:nth-child(3n) {
        background: rgba(251, 188, 5, 0.95) !important;
        color: #000000 !important;
        text-shadow: none;
      }

      .calendar-container.google-dark-theme .day-event:nth-child(4n),
      .calendar-container.google-light-theme .day-event:nth-child(4n) {
        background: rgba(234, 67, 53, 0.95) !important;
        color: #ffffff !important;
      }

      .calendar-container.google-dark-theme .more-events,
      .calendar-container.google-light-theme .more-events {
        font-size: 8px;
        padding: 1px 3px;
        border-radius: 4px;
        text-align: center;
        margin-top: 1px;
        font-weight: 600;
      }

      .calendar-container.google-dark-theme .more-events {
        background: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .calendar-container.google-light-theme .more-events {
        background: rgba(66, 133, 244, 0.2);
        color: #4285f4;
        border: 1px solid rgba(66, 133, 244, 0.3);
      }

      .calendar-container.google-dark-theme .day.weekend,
      .calendar-container.google-light-theme .day.weekend {
        background: rgba(255, 255, 255, 0.02);
      }

      .calendar-container.google-dark-theme .day.today,
      .calendar-container.google-light-theme .day.today {
        transform: none;
        border: 2px solid rgba(66, 133, 244, 0.8);
      }

      .calendar-container.google-dark-theme .day.today {
        background: linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(52, 168, 83, 0.1) 100%);
      }

      .calendar-container.google-light-theme .day.today {
        background: linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(52, 168, 83, 0.05) 100%);
      }

      .calendar-container.google-dark-theme .day.today .day-number,
      .calendar-container.google-light-theme .day.today .day-number {
        font-size: 13px;
        font-weight: 800;
      }

      .calendar-container.google-dark-theme .day.today .day-number {
        background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .calendar-container.google-light-theme .day.today .day-number {
        color: #4285f4;
      }

      .calendar-container.google-dark-theme .day:active,
      .calendar-container.google-light-theme .day:active {
        transform: scale(0.98);
        opacity: 0.8;
      }

      .calendar-container.google-dark-theme .day:active {
        background: rgba(66, 133, 244, 0.1) !important;
      }

      .calendar-container.google-light-theme .day:active {
        background: rgba(66, 133, 244, 0.05) !important;
      }

      .calendar-container.google-dark-theme .weekdays,
      .calendar-container.google-light-theme .weekdays {
        padding: 8px 0;
      }

      .calendar-container.google-dark-theme .weekday,
      .calendar-container.google-light-theme .weekday {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 2px;
      }

      .calendar-container.google-dark-theme .days,
      .calendar-container.google-light-theme .days {
        gap: 1px;
        background: none;
      }

      /* ========================================
          SFONDI MOBILE PER TUTTI I TEMI
          ======================================== */

        @media (max-width: 768px) {
          /* Importante: Assicura che il container abbia priorità assoluta */
          .calendar-container {
            position: relative !important;
            z-index: 1 !important;
          }

          /* Tema Scuro Originale - Mantieni gradiente originale */
          .calendar-container:not(.light-theme):not(.google-dark-theme):not(.google-light-theme) {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%) !important;
            background-size: 400% 400% !important;
            animation: futuristicBg 8s ease infinite !important;
          }

          /* Tema Chiaro Originale - Mantieni gradiente originale */
          .calendar-container.light-theme {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%) !important;
            background-size: 400% 400% !important;
            animation: futuristicBgLight 8s ease infinite !important;
          }

          /* Tema Google Dark - Sfondo solido scuro */
          .calendar-container.google-dark-theme {
            background: #202124 !important;
            color: #e8eaed !important;
          }

          /* Tema Google Light - Gradiente chiaro */
          .calendar-container.google-light-theme {
            background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%) !important;
            color: #202124 !important;
          }

          /* Assicurati che i contenitori mantengano il padding mobile */
          .calendar-container {
            padding: 16px !important;
          }

          /* Header mobile per temi originali */
          .calendar-container:not(.google-dark-theme):not(.google-light-theme) .header {
            background: transparent !important;
          }

          /* Header mobile per temi Google */
          .calendar-container.google-dark-theme .header {
            background: #202124 !important;
          }

          .calendar-container.google-light-theme .header {
            background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%) !important;
          }

                     /* Weekdays mobile - SFONDI SPECIFICI PER TEMA */

           /* Mobile - Sfondi Specifici per Tema - UNIFICATI */

           /* Weekdays */
           .calendar-container:not(.light-theme):not(.google-dark-theme):not(.google-light-theme) .weekdays {
             background: linear-gradient(90deg, rgba(0, 212, 255, 0.08), rgba(147, 51, 234, 0.08)) !important;
             border: 1px solid rgba(0, 212, 255, 0.15) !important;
           }

           .calendar-container.light-theme .weekdays {
             background: linear-gradient(90deg, rgba(59, 130, 246, 0.12), rgba(124, 58, 237, 0.12)) !important;
             border: 1px solid rgba(59, 130, 246, 0.25) !important;
           }

           .calendar-container.google-dark-theme .weekdays {
             background: #2d2e30 !important;
             border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
           }

           .calendar-container.google-light-theme .weekdays {
             background: rgba(248, 251, 255, 0.6) !important;
             border-bottom: 1px solid rgba(218, 220, 224, 0.4) !important;
           }

           /* Days Container */
           .calendar-container:not(.light-theme):not(.google-dark-theme):not(.google-light-theme) .days {
             background: linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.8) 100%) !important;
           }

           .calendar-container.light-theme .days {
             background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(226, 232, 240, 0.9) 50%, rgba(203, 213, 225, 0.9) 100%) !important;
           }

           .calendar-container.google-dark-theme .days {
             background: #202124 !important;
           }

           .calendar-container.google-light-theme .days {
             background: linear-gradient(135deg, rgba(248, 251, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%) !important;
           }

           /* Container Backgrounds */
           .calendar-container:not(.light-theme):not(.google-dark-theme):not(.google-light-theme) {
             background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%) !important;
           }

           .calendar-container.light-theme {
             background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%) !important;
           }

           .calendar-container.google-dark-theme {
             background: #202124 !important;
           }

           .calendar-container.google-light-theme {
             background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%) !important;
           }

           /* Month Navigation */
           .calendar-container:not(.light-theme):not(.google-dark-theme):not(.google-light-theme) .month-nav {
             background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(147, 51, 234, 0.15)) !important;
             border: 1px solid rgba(0, 212, 255, 0.3) !important;
             backdrop-filter: blur(15px) !important;
           }

           .calendar-container.light-theme .month-nav {
             background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2)) !important;
             border: 1px solid rgba(59, 130, 246, 0.4) !important;
             backdrop-filter: blur(15px) !important;
           }

           .calendar-container.google-dark-theme .month-nav {
             background: rgba(255, 255, 255, 0.1) !important;
             border: 1px solid rgba(255, 255, 255, 0.2) !important;
             backdrop-filter: blur(10px) !important;
           }

           .calendar-container.google-light-theme .month-nav {
             background: rgba(66, 133, 244, 0.1) !important;
             border: 1px solid rgba(66, 133, 244, 0.2) !important;
             backdrop-filter: blur(10px) !important;
           }

           /* Clean Overrides */
           .calendar-container * {
             background-color: transparent;
           }

           .calendar-container .daily-view,
           .calendar-container .weekly-view,
           .calendar-container .monthly-view {
             background: transparent !important;
           }

           .calendar-container .day:not(.today),
           .calendar-container .day.weekend,
           .calendar-container .day.holiday {
             background: transparent !important;
             border-radius: 8px !important;
           }

           .calendar-container.google-dark-theme *,
           .calendar-container.google-light-theme * {
             color: inherit;
           }
         }

      /* ========================================
         RESPONSIVE DESIGN - MOBILE/DESKTOP
         ======================================== */

      /* Mobile First - Tutti i temi */
      @media (max-width: 768px) {
        .calendar-container {
          padding: 8px;
          margin: 0;
          border-radius: 8px;
        }

        .header {
          padding: 4px 0;
          margin-bottom: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 60px;
        }

        .month-nav {
          gap: 4px;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 0 8px;
          min-height: 44px;
        }

        .month-title {
          font-size: 13px;
          text-align: center;
          width: auto;
          max-width: 60%;
          order: -1;
          margin-bottom: 4px;
          padding: 0 8px;
          line-height: 1.2;
          word-wrap: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .view-buttons {
          gap: 2px;
          display: flex;
          flex-wrap: nowrap;
          order: 2;
        }

        .view-button {
          padding: 4px 8px;
          font-size: 11px;
          min-width: 28px;
          height: 32px;
          border-radius: 6px;
        }

        .nav-button, .sync-button {
          width: 32px;
          height: 32px;
          padding: 6px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        /* Layout separato per navigazione mobile */
        .month-nav .nav-button:first-child {
          order: 0;
          margin-right: auto;
        }

        .month-nav .nav-button:last-of-type:not(.sync-button) {
          order: 1;
          margin-left: auto;
        }

        .month-nav .sync-button {
          order: 3;
          margin-left: 4px;
        }

        /* Vista Giornaliera Mobile */
        .daily-view {
          padding: 8px 0;
        }

        .daily-event {
          margin-bottom: 8px;
          padding: 12px;
          border-radius: 8px;
        }

        .event-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .event-actions {
          align-self: flex-end;
        }

        .event-title {
          font-size: 16px;
          line-height: 1.4;
        }

        .event-time {
          font-size: 14px;
        }

        .no-events-today {
          padding: 40px 20px;
          text-align: center;
        }

        .no-events-icon {
          font-size: 48px;
        }

        /* Vista Settimanale Mobile */
        .weekly-view .desktop-layout {
          display: none;
        }

        .weekly-view .mobile-layout {
          display: block;
        }

        .week-header {
          display: none;
        }

        .week-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .week-day {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, #333);
          margin-bottom: 8px;
        }

        .week-day-info {
          min-width: 80px;
          margin-right: 16px;
        }

        .week-events-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .week-event {
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        /* Vista Mensile Mobile */
        .weekdays {
          grid-template-columns: repeat(7, 1fr);
          gap: 0;
        }

        .weekday {
          padding: 8px 4px;
          font-size: 10px;
          text-align: center;
        }

        .days {
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--divider-color, #333);
        }

        .day {
          min-height: 60px;
          padding: 4px;
          background: var(--card-background-color, #000);
          font-size: 14px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
        }

        .day.today {
          font-weight: bold;
          border-radius: 8px !important;
        }

        /* Popup Responsive */
        .calendar-popup-overlay .popup-container {
          width: 95%;
          max-width: none;
          height: 90vh;
          max-height: 90vh;
          margin: 5vh auto;
          flex-direction: column;
        }

        .popup-side {
          width: 100%;
          max-height: 45%;
          overflow-y: auto;
        }

        .popup-side:first-child {
          border-right: none;
          border-bottom: 1px solid var(--divider-color, #333);
        }

        .popup-title {
          font-size: 18px;
          padding: 12px 16px;
        }

        .popup-content {
          padding: 12px 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          font-size: 14px;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group textarea {
          font-size: 16px;
          padding: 12px;
        }

        .event-item {
          padding: 12px;
          margin-bottom: 8px;
        }

        .event-item-title {
          font-size: 16px;
          margin-bottom: 4px;
        }

        .event-item-time {
          font-size: 14px;
        }

        .event-actions {
          gap: 8px;
          margin-top: 8px;
        }

        .event-actions button {
          padding: 8px 12px;
          font-size: 14px;
        }
      }

      /* Desktop */
      @media (min-width: 769px) {
        .weekly-view .mobile-layout {
          display: none;
        }

        .weekly-view .desktop-layout {
          display: block;
        }

        .calendar-container {
          padding: 16px;
        }

        .header {
          padding: 16px 0;
          margin-bottom: 16px;
        }

        .month-title {
          font-size: 18px;
        }

        .day {
          min-height: 50px;
          padding: 8px;
        }

        .daily-event {
          margin-bottom: 12px;
          padding: 16px;
        }

        .popup-container {
          width: 90%;
          max-width: 80vw;
          height: auto;
          max-height: 85vh;
        }
      }

      /* Override finale per assicurare che i weekend siano sempre rossi */
      .weekday.weekend,
      .day.weekend,
      .week-day.weekend,
      .calendar-container .weekday.weekend,
      .calendar-container .day.weekend,
      .calendar-container .week-day.weekend,
      .calendar-container.light-theme .weekday.weekend,
      .calendar-container.light-theme .day.weekend,
      .calendar-container.light-theme .week-day.weekend,
      .calendar-container.google-dark-theme .weekday.weekend,
      .calendar-container.google-dark-theme .day.weekend,
      .calendar-container.google-light-theme .weekday.weekend,
      .calendar-container.google-light-theme .day.weekend {
        color: #ff3333 !important;
      }

      .calendar-container.light-theme .weekday.weekend,
      .calendar-container.light-theme .day.weekend,
      .calendar-container.light-theme .week-day.weekend {
        color: #dd0000 !important;
      }

      /* Override finale per i numeri dei giorni weekend */
      .calendar-container.google-dark-theme .day.weekend .day-number,
      .calendar-container.google-light-theme .day.weekend .day-number {
        color: #ff3333 !important;
        font-weight: 700 !important;
      }

      .calendar-container.light-theme .day.weekend .day-number {
        color: #dd0000 !important;
        font-weight: 700 !important;
      }
    `;
  }
    connectedCallback() {
    super.connectedCallback();
    if (this.hass && !this._hassFetched) {
      this._hassFetched = true;
      this._loadCalendars();
    }

    // Se già configurato, imposta la data corrente e carica eventi
    if (this._isConfigured) {
      // Se siamo in vista settimanale, assicuriamoci di avere la data corretta
      if (this._selectedView === 'weekly') {
        // Imposta la data all'inizio della settimana corrente
        this._currentDate = this._getStartOfWeek(new Date());
      } else {
        this._currentDate = new Date();
      }

      this._fetchEvents();
      this._startAutoSync();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Ferma la sincronizzazione automatica quando la card viene rimossa
    this._stopAutoSync();
  }

  _startAutoSync() {
    // Cancella timer esistente se presente
    this._stopAutoSync();

    let syncCounter = 0;

    // Sincronizza ogni 30 secondi, con refresh Better Calendar ogni 5 minuti
    this._syncTimer = setInterval(async () => {
      if (this._hass && this._calendars && this._calendars.length > 0) {
        syncCounter++;

        // Ogni 30 secondi: ricarica eventi dalla card
        // Sincronizzazione automatica
        this._fetchEvents();

        // Ogni 5 minuti (10 cicli da 30s): refresh completo del Better Calendar
        if (syncCounter >= 10) {

          await this._refreshBetterCalendar();
          syncCounter = 0;
        }
      }
    }, 30000); // 30 secondi


  }

  _stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;

    }
  }

  async _refreshBetterCalendar() {
    if (!this._hass) return;

    try {
      // Forza l'aggiornamento dei sensori Better Calendar
      const betterCalendarSensors = [
        'sensor.better_calendar_summary',
        'sensor.better_calendar_upcoming',
        'sensor.better_calendar_yesterday',
        'sensor.better_calendar_today',
        'sensor.better_calendar_tomorrow',
        'sensor.better_calendar_this_week'
      ];


      for (const sensorId of betterCalendarSensors) {
        if (this._hass.states[sensorId]) {
          await this._hass.callService('homeassistant', 'update_entity', {
            entity_id: sensorId
          });

        }
      }

      // Attende un momento per permettere la sincronizzazione
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('Errore durante il refresh Better Calendar:', error);
    }
  }

  async _loadCalendars() {
    if (!this._hass) return;

    // Carica tutti i calendari disponibili nel sistema
    this._availableCalendars = Object.keys(this._hass.states)
      .filter(eid =>
        eid.startsWith('calendar.') &&
        this._hass.states[eid].state !== 'unavailable'
      )
      .map((eid, idx) => ({
        entity_id: eid,
        name: this._hass.states[eid].attributes.friendly_name || eid.split('.')[1],
        backgroundColor: this._hass.states[eid].attributes.backgroundColor || this._getColorByIndex(idx),
        type: this._getCalendarType(eid)
      }));

    // Carica tutti i dispositivi disponibili (mobile_app e Alexa)
    const mobileTrackers = Object.keys(this._hass.states)
      .filter(eid => eid.startsWith('device_tracker.') && eid.includes('mobile'))
      .map(eid => ({
        entity_id: eid,
        name: this._hass.states[eid]?.attributes?.friendly_name || eid.replace('device_tracker.', ''),
        type: 'mobile'
      }));

    const mobileNotifyServices = Object.keys(this._hass.services.notify || {})
      .filter(service => service.startsWith('mobile_app_'))
      .map(service => ({
        entity_id: `notify.${service}`,
        name: service.replace('mobile_app_', '').replace(/_/g, ''),
        type: 'mobile'
      }));

    this._availableDevices = {
      mobile: [...mobileTrackers, ...mobileNotifyServices],
      alexa: Object.keys(this._hass.states)
        .filter(eid => eid.startsWith('media_player.') &&
          (eid.includes('alexa') || eid.includes('echo')))
        .map(eid => ({
          entity_id: eid,
          name: this._hass.states[eid].attributes?.friendly_name || eid.split('.')[1],
          type: 'alexa'
        }))
    };

    // Se la card è configurata, carica i calendari selezionati
    if (this._isConfigured && this._selectedCalendars.length > 0) {
      this._calendars = this._availableCalendars.filter(cal =>
        this._selectedCalendars.includes(cal.entity_id)
      );

      // Trova il calendario principale (mantieni solo l'entity_id come stringa)
      const primaryCalendarId = this._primaryCalendar;
      if (primaryCalendarId) {
        const primaryCal = this._calendars.find(cal => cal.entity_id === primaryCalendarId);
        if (primaryCal) {
          // Mantieni solo l'ID, non l'oggetto completo
          console.info(`Better Calendar Card - Calendario principale: ${primaryCal.name} (${primaryCal.entity_id})`);
        } else {
          // Se il calendario principale non esiste più, scegli il primo disponibile
          this._primaryCalendar = this._calendars.length > 0 ? this._calendars[0].entity_id : null;
        }
      } else {
        this._primaryCalendar = this._calendars.length > 0 ? this._calendars[0].entity_id : null;
      }
    }
  }

  _getCalendarType(entityId) {
    if (entityId.includes('google')) return 'Google Calendar';
    if (entityId.includes('outlook')) return 'Outlook';
    if (entityId.includes('caldav')) return 'CalDAV';
    return 'Locale';
  }

  _getColorByIndex(index) {
    const colors = [
      '#3182ce', '#e53e3e', '#38a169', '#805ad5', '#d69e2e',
      '#319795', '#dd6b20', '#3182ce', '#2c5282', '#744210'
    ];
    return colors[index % colors.length];
  }

  async _fetchEvents() {
    // Evita chiamate multiple simultanee
    if (this._isFetchingEvents) {
      return;
    }

    this._isFetchingEvents = true;

    try {
      // Resetta eventi una sola volta
      this._events = [];

      // 📋 STRATEGIA IBRIDA:
      // 1. Carica eventi base dalle API Home Assistant (per compatibilità con tutti i calendari)
      // 2. Arricchisci con notifiche dal file JSON Better Calendar

      // Caricamento eventi ibrido

      // FASE 1: Carica eventi dalle API Home Assistant
      const eventsFromHA = await this._loadEventsFromHomeAssistant();

      // FASE 2: Carica dati Better Calendar (notifiche + eventuali eventi aggiuntivi)
      const betterCalendarData = await this._loadBetterCalendarData();

      // FASE 3: Combina i dati - eventi HA + notifiche Better Calendar
      // Il refresh viene già gestito in _loadBetterCalendarData se necessario
      this._events = await this._mergeEventsWithNotifications(eventsFromHA, betterCalendarData);

      // Eventi processati con successo

      // Usa il sistema di aggiornamento di LitElement
      super.requestUpdate();

    } finally {
      this._isFetchingEvents = false;
    }
  }

  async _loadEventsFromHomeAssistant() {

    const events = [];

    if (!this._hass || !this._calendars || this._calendars.length === 0) {
      return events;
    }

    // Calcola l'intervallo di date da richiedere in base alla vista corrente
    let start, end;

    if (this._selectedView === 'weekly') {
      // In vista settimanale carichiamo sempre da lunedì a domenica della settimana corrente
      start = this._getStartOfWeek(this._currentDate);
      end = new Date(start);
      end.setDate(start.getDate() + 6); // ultimo giorno (domenica)
    } else if (this._selectedView === 'daily') {
      // In vista giornaliera basta il singolo giorno
      start = new Date(this._currentDate);
      end = new Date(this._currentDate);
    } else {
      // Vista mensile (o default) – intero mese
      start = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth(), 1);
      end = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() + 1, 0);
    }

    // Normalizza orario di inizio/fine giorno
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const params = `?start=${start.toISOString()}&end=${end.toISOString()}`;

    for (const calendar of this._calendars) {
      try {
        const result = await this._hass.callApi(
          'GET',
          `calendars/${calendar.entity_id}${params}`
        );

        const calendarEvents = result.map(ev => {
              const startDate = this._getCalendarDate(ev.start);
              const endDate = this._getCalendarDate(ev.end);
              const isAllDay = startDate && !startDate.includes('T');

              return {
                id: ev.uid || `${ev.summary}_${startDate}_${Date.now()}`,
          summary: ev.summary,
            description: ev.description || '',
                start: startDate,
                end: endDate,
                isAllDay: isAllDay,
          backgroundColor: calendar.backgroundColor,
          calendar: calendar.entity_id,
          recurrence_id: ev.recurrence_id,
                rrule: ev.rrule,
                isLocal: false,
            isEditable: calendar.entity_id === this._primaryCalendar,
            notifications: [], // Saranno aggiunte nella fase merge
            source: 'home_assistant'
              };
            });

        events.push(...calendarEvents);


      } catch (error) {
        console.error(`❌ Errore caricamento eventi da ${calendar.entity_id}:`, error);
          }
        }


    return events;
  }

  async _loadBetterCalendarData() {
    // Approccio semplificato: carica direttamente dal sensore delle notifiche
    try {
      // Prima prova a caricare i dati dal sensore notifiche
      let eventsData = { events: {}, calendars: {} };
      let notificationsData = {};

      // Cerca il sensore delle notifiche per ottenere i dati
      const entities = Object.keys(this._hass.states);
      const notificationsSensorId = entities.find(id =>
        id.includes('better_calendar') && id.includes('notifications')
      );

      if (notificationsSensorId) {
        const notificationsSensor = this._hass.states[notificationsSensorId];
        if (notificationsSensor && notificationsSensor.attributes) {
          // Prova a ottenere i dati dal sensore
          eventsData = notificationsSensor.attributes.events_data || { events: {}, calendars: {} };
          notificationsData = notificationsSensor.attributes.notifications_data || {};
        }
      }

      // Se non abbiamo dati dal sensore, usa un refresh del coordinator (max 1 volta per sessione)
      if (!eventsData.events || Object.keys(eventsData.events).length === 0) {
        if (!this._hasTriedRefresh) {
          this._hasTriedRefresh = true;
          try {
            await this._hass.callService('better_calendar', 'force_update_calendars', {});

            // Aspetta un po' e riprova dal sensore
            await new Promise(resolve => setTimeout(resolve, 500));

            if (notificationsSensorId) {
              const sensor = this._hass.states[notificationsSensorId];
              if (sensor && sensor.attributes) {
                eventsData = sensor.attributes.events_data || { events: {}, calendars: {} };
                notificationsData = sensor.attributes.notifications_data || {};
              }
            }
          } catch (error) {
            console.warn('⚠️ Errore con force_update_calendars:', error);
          }
        }
      }

      // Integra le notifiche negli eventi se presenti
      if (Object.keys(notificationsData).length > 0 && eventsData.events) {
        for (const [calendarId, events] of Object.entries(eventsData.events)) {
          for (const event of events) {
            // Cerca notifiche per questo evento con criteri più flessibili
            const eventNotifications = [];

            for (const [notifId, notification] of Object.entries(notificationsData)) {
              let isMatchingEvent = false;

              // Prova matching per ID diretto
              if (notification.event_id === event.uid) {
                isMatchingEvent = true;
              }

              // Prova matching per summary + data
              if (!isMatchingEvent && notification.event_summary === event.summary) {
                const notifDate = notification.event_start.split('T')[0];
                const eventDate = (event.start?.dateTime || event.start?.date || '').split('T')[0];

                if (notifDate === eventDate) {
                  isMatchingEvent = true;
                }
              }

              // Prova matching per summary + orario completo se disponibile
              if (!isMatchingEvent && notification.event_summary === event.summary &&
                  notification.event_start && event.start?.dateTime) {
                if (notification.event_start === event.start.dateTime) {
                  isMatchingEvent = true;
                }
              }

              if (isMatchingEvent) {
                eventNotifications.push({
                  id: notification.id || notifId,
                  notification_type: notification.notification_type,
                  offset_minutes: notification.offset_minutes,
                  target_device: notification.target_device,
                  enabled: notification.enabled !== false
                });
              }
            }

            // Aggiungi le notifiche all'evento
            event.notifications = eventNotifications;
          }
        }
    }

    return eventsData;

    } catch (error) {
      console.error('❌ Errore caricamento dati Better Calendar:', error);
      return { events: {}, calendars: {} };
    }
  }

  async _mergeEventsWithNotifications(haEvents, betterCalendarData) {
    // Controlla se abbiamo dati Better Calendar
    if (!betterCalendarData || !betterCalendarData.events) {
      // Fallback: carica le notifiche direttamente dal sensore
      const notificationsSensor = await this._getNotificationsSensor();
      if (notificationsSensor) {
        const sensorData = notificationsSensor.attributes || {};
        const notificationsData = sensorData.notifications_data || {};

        // Associa le notifiche agli eventi HA
        for (const haEvent of haEvents) {
          const eventNotifications = [];

          for (const [notifId, notification] of Object.entries(notificationsData)) {
            let isMatch = false;

            // Prova matching per ID diretto
            if (notification.event_id === haEvent.id) {
              isMatch = true;
            }

            // Prova matching per summary + data/ora
            if (!isMatch && notification.event_summary === haEvent.summary) {
              const notifStart = notification.event_start;
              const eventStart = this._getCalendarDate(haEvent.start);

              if (notifStart === eventStart) {
                isMatch = true;
              }
            }

            if (isMatch) {
              eventNotifications.push({
                id: notification.id || notifId,
                notification_type: notification.notification_type,
                offset_minutes: notification.offset_minutes,
                target_device: notification.target_device,
                enabled: notification.enabled !== false
              });
            }
          }

          haEvent.notifications = eventNotifications;
        }

        return haEvents;
      }
    }

    // Processo originale con Better Calendar Data
    const betterCalendarEvents = betterCalendarData.events || {};

    // Crea un indice delle notifiche Better Calendar per lookup veloce
    const notificationsIndex = {};
    for (const [calendarId, events] of Object.entries(betterCalendarEvents)) {
      for (const event of events) {
        if (event.notifications && event.notifications.length > 0) {
          // Crea chiavi di lookup multiple per massima compatibilità
          const eventStartStr = this._getCalendarDate(event.start);
          const keys = [
            `${event.summary}_${event.start}`, // Chiave principale
            `${event.summary}_${eventStartStr}`, // Con data normalizzata
            event.uid, // UID diretto se disponibile
            event.id, // ID diretto se disponibile
            // Aggiungi anche varianti più flessibili
            `${event.summary.toLowerCase()}_${eventStartStr}`,
            `${event.summary.trim()}_${eventStartStr}`
          ].filter(Boolean);

          for (const key of keys) {
            notificationsIndex[key] = event.notifications;
          }
        }
      }
    }

    // Arricchisci SOLO gli eventi HA con le notifiche (NO duplicazione eventi)
    for (const haEvent of haEvents) {
      // Prova diverse chiavi di lookup per trovare le notifiche
      const haEventStartStr = this._getCalendarDate(haEvent.start);
      const lookupKeys = [
        `${haEvent.summary}_${haEvent.start}`,
        `${haEvent.summary}_${haEventStartStr}`,
        haEvent.id,
        haEvent.uid,
        // Aggiungi anche varianti più flessibili
        `${haEvent.summary.toLowerCase()}_${haEventStartStr}`,
        `${haEvent.summary.trim()}_${haEventStartStr}`
      ].filter(Boolean);

      let foundNotifications = null;
      for (const key of lookupKeys) {
        if (notificationsIndex[key]) {
          foundNotifications = notificationsIndex[key];
          break;
        }
      }

      // Aggiungi le notifiche se trovate
      haEvent.notifications = foundNotifications || [];
    }

    return haEvents; // Ritorna solo gli eventi HA arricchiti con notifiche
  }

  _getCalendarDate(dateObj) {
    if (typeof dateObj === 'string') {
      return dateObj;
    }

    if (dateObj.dateTime) {
      return dateObj.dateTime;
    }

    if (dateObj.date) {
      return dateObj.date;
    }

    return undefined;
  }

  _handleNavigate(increment) {
    const newDate = new Date(this._currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    this._currentDate = newDate;
    this._isFirstLoad = true; // Forza il refresh per il nuovo mese
    this._hasTriedRefresh = false; // Reset del flag per permettere refresh nella nuova data
    this._fetchEvents(); // Ricarica gli eventi per il nuovo mese
  }

  _handleNavigateDay(increment) {
    const newDate = new Date(this._currentDate);
    newDate.setDate(newDate.getDate() + increment);
    this._currentDate = newDate;
    this._isFirstLoad = true; // Forza il refresh per il nuovo giorno
    this._hasTriedRefresh = false; // Reset del flag per permettere refresh nella nuova data
    this._fetchEvents(); // Ricarica gli eventi per il nuovo giorno
  }

  _handleNavigateWeek(increment) {
    const newDate = new Date(this._currentDate);
    newDate.setDate(newDate.getDate() + (increment * 7));
    this._currentDate = newDate;
    this._isFirstLoad = true; // Forza il refresh per la nuova settimana
    this._hasTriedRefresh = false; // Reset del flag per permettere refresh nella nuova data
    this._fetchEvents(); // Ricarica gli eventi per la nuova settimana
  }

  _getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Lunedì come primo giorno
    start.setDate(diff);
    return start;
  }

  _changeView(newView) {
    // Salva la data corrente prima del cambio vista
    let currentDate = new Date(this._currentDate);

    // Se stiamo passando alla vista settimanale, assicuriamoci di mantenere la stessa settimana
    if (newView === 'weekly') {
      // Non modifichiamo la data, usiamo quella corrente come riferimento per la settimana
      this._currentDate = currentDate;
    } else if (newView === 'daily') {
      // Se veniamo dalla vista settimanale, manteniamo il giorno selezionato
      this._currentDate = currentDate;
    } else {
      // Vista mensile - imposta al primo del mese solo se necessario
      if (this._selectedView === 'monthly') {
        this._currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      } else {
        this._currentDate = currentDate;
      }
    }

    this._selectedView = newView;

    // Salva la nuova vista nelle impostazioni
    this._saveSettings();

    // Forza il refresh degli eventi con il nuovo intervallo di date
    this._isFirstLoad = true; // Forza il refresh per la nuova vista
    this._hasTriedRefresh = false; // Reset del flag per permettere refresh nella nuova vista
    this._fetchEvents();

    // Mostra messaggio di feedback
    const viewNames = {
      'daily': 'Giornaliera 📆',
      'weekly': 'Settimanale 📋',
      'monthly': 'Mensile 🗓️'
    };

    this._showSuccessMessage(`Vista ${viewNames[newView]} attivata!`, 'blue');

    // Aggiorna il rendering
    this.requestUpdate();
  }

  async _handleManualSync() {
    if (this._isFetchingEvents) return; // Evita sincronizzazioni multiple



    // Forza aggiornamento di tutti i calendari
    if (this._hass && this._calendars && this._calendars.length > 0) {
      try {
        // Prima forza l'aggiornamento delle entità calendario
        for (const calendar of this._calendars) {
          await this._hass.callService('homeassistant', 'update_entity', {
            entity_id: calendar.entity_id
          });
        }

        // Poi aggiorna i sensori Better Calendar
        await this._refreshBetterCalendar();

        // Aspetta un momento per permettere la sincronizzazione
        await new Promise(resolve => setTimeout(resolve, 300));

        // Poi ricarica gli eventi
        await this._fetchEvents();

        // Mostra messaggio di successo
        this._showSuccessMessage('📱 Calendario e Better Calendar sincronizzati!', 'blue');

      } catch (error) {
        console.error('Errore durante la sincronizzazione manuale:', error);
        this._showSuccessMessage(this._t('syncError'), 'pink');
      }
    }
  }



  _showAdvancedConfigPopup() {
    // Rimuovi eventuali popup già aperti
    const existingPopups = document.querySelectorAll('.config-popup-overlay');
    existingPopups.forEach(p => p.remove());

    const popup = document.createElement('div');
        popup.className = `config-popup-overlay ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}`;
    popup.innerHTML = this._getAdvancedConfigContent();

    // Aggiungi stili del popup al document head se non già presenti
    if (!document.querySelector('#calendar-config-styles')) {
      const style = document.createElement('style');
      style.id = 'calendar-config-styles';
      style.textContent = this._getAdvancedConfigStyles();
      document.head.appendChild(style);
    }

    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        // Non chiudere automaticamente per evitare perdita configurazione
      }
    });

    document.body.appendChild(popup);
    this._attachAdvancedConfigEventListeners(popup);
  }









  _renderSetup() {
    return html`
      <div class="setup-container ${this._theme === 'light' ? 'light-theme' : this._theme === 'google' ? 'google-theme' : ''}">
        <div class="setup-title">🚀 Benvenuto</div>
        <div class="setup-subtitle">Configura il tuo calendario futuristico</div>

        <div class="setup-section">
          <div class="setup-section-title">🎨 Scegli il tema</div>
          <div class="theme-selector">
            <div class="theme-option ${this._theme === 'dark' ? 'active' : ''}" @click="${() => this._handleSetupThemeChange('dark')}">
              <div>🌙 Scuro</div>
              <div class="theme-preview dark"></div>
            </div>
            <div class="theme-option ${this._theme === 'light' ? 'active' : ''}" @click="${() => this._handleSetupThemeChange('light')}">
              <div>☀️ Chiaro</div>
              <div class="theme-preview light"></div>
            </div>
            <div class="theme-option ${this._theme === 'google-dark' ? 'active' : ''}" @click="${() => this._handleSetupThemeChange('google-dark')}">
              <div>🌙 Google Dark</div>
              <div class="theme-preview google-dark"></div>
            </div>
            <div class="theme-option ${this._theme === 'google-light' ? 'active' : ''}" @click="${() => this._handleSetupThemeChange('google-light')}">
              <div>☀️ Google Light</div>
              <div class="theme-preview google-light"></div>
            </div>
          </div>
        </div>

        <div class="setup-section">
          <div class="setup-section-title">📅 Seleziona i calendari</div>
          <div class="calendar-list">
            ${this._availableCalendars.length > 0 ?
              this._availableCalendars.map(calendar => html`
                <div class="calendar-item ${this._selectedCalendars.includes(calendar.entity_id) ? 'selected' : ''}"
                     @click="${() => this._toggleCalendarSelection(calendar.entity_id)}">
                  <div class="calendar-checkbox ${this._selectedCalendars.includes(calendar.entity_id) ? 'checked' : ''}"></div>
                  <div class="calendar-info">
                    <div class="calendar-name">${calendar.name}</div>
                    <div class="calendar-entity">${calendar.entity_id}</div>
                  </div>
                  ${this._primaryCalendar === calendar.entity_id ? html`
                    <div class="primary-badge">Principale</div>
                  ` : ''}
                  ${this._selectedCalendars.includes(calendar.entity_id) && this._primaryCalendar !== calendar.entity_id ? html`
                    <div class="primary-badge" @click="${(e) => this._setPrimaryCalendar(e, calendar.entity_id)}">Rendi Principale</div>
                  ` : ''}
                </div>
              `) : html`
                <div class="no-calendars">
                  🔍 Nessun calendario trovato.<br>
                  Assicurati di aver configurato almeno un calendario in Home Assistant.
                </div>
              `
            }
          </div>
        </div>

        <div class="setup-actions">
          <button class="setup-button"
                  ?disabled="${this._selectedCalendars.length === 0}"
                  @click="${() => this._completeSetup()}">
            ✅ Completa Configurazione
          </button>
        </div>
      </div>
    `;
  }

  _handleSetupThemeChange(newTheme) {
    this._theme = newTheme;
    this.requestUpdate();
  }

  _toggleCalendarSelection(calendarId) {
    const index = this._selectedCalendars.indexOf(calendarId);
    if (index === -1) {
      // Aggiungi calendario
      this._selectedCalendars.push(calendarId);
      // Se è il primo calendario selezionato, rendilo principale
      if (this._selectedCalendars.length === 1) {
        this._primaryCalendar = calendarId;
      }
    } else {
      // Rimuovi calendario
      this._selectedCalendars.splice(index, 1);
      // Se era il principale, scegli un altro
      if (this._primaryCalendar === calendarId) {
        this._primaryCalendar = this._selectedCalendars.length > 0 ? this._selectedCalendars[0] : null;
      }
    }
    this.requestUpdate();
  }

  _setPrimaryCalendar(event, calendarId) {
    event.stopPropagation(); // Evita di deselezionare il calendario
    this._primaryCalendar = calendarId;
    this.requestUpdate();
  }

  _completeSetup() {
    if (this._selectedCalendars.length === 0) {
      this._showSuccessMessage('❌ Seleziona almeno un calendario', 'pink');
      return;
    }

    // Salva la configurazione
    this._isConfigured = true;
    this._showSetup = false;
    this._saveSettings();

    // Carica i calendari configurati
    this._loadCalendars();

    // Mostra messaggio di successo
    this._showSuccessMessage('🚀 Configurazione completata!', 'orange');

    // Avvia la sincronizzazione
    this._fetchEvents();
    this._startAutoSync();



    // Aggiorna il rendering
    this.requestUpdate();
  }

  _resetConfiguration() {
    // Conferma prima di resettare
    if (!confirm('Sei sicuro di voler resettare la configurazione? Tutti i tuoi calendari e impostazioni andranno persi.')) {
      return;
    }

    // Reset completo
    this._isConfigured = false;
    this._showSetup = true;
    this._selectedCalendars = [];
    this._primaryCalendar = null;
    this._theme = 'dark';
    this._calendars = [];
    this._events = [];

    // Rimuovi dalle impostazioni salvate
    try {
      localStorage.removeItem('better-calendar-card-settings');
    } catch (error) {
      console.warn('Errore nella rimozione impostazioni:', error);
    }

    // Ferma la sincronizzazione automatica
    this._stopAutoSync();

    this._showSuccessMessage('🔄 Configurazione resettata', 'blue');
    this.requestUpdate();
  }

  _handleDayClick(dayOrDate) {
    let selectedDate;

    // Se è già un oggetto Date, usalo direttamente
    if (dayOrDate instanceof Date) {
      selectedDate = new Date(dayOrDate);
    } else {
      // Se è un numero, crea la data per il mese corrente
      selectedDate = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth(), dayOrDate);
    }

    this._showEventPopup(selectedDate);
  }

  _getPopupStyles() {
    return `


      .calendar-popup-overlay.popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999;
        font-family: 'Orbitron', 'Roboto', sans-serif;
      }

      .calendar-popup-overlay.light-theme {
        background: rgba(255, 255, 255, 0.85);
      }

      .calendar-popup-overlay .popup-container {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 20px;
        width: 90%;
        max-width: 80vw;
        display: flex;
        overflow: hidden;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(0, 212, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
      }

      .calendar-popup-overlay.light-theme .popup-container {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        border: 1px solid rgba(59, 130, 246, 0.4);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 60px rgba(59, 130, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      /* ==== TEMI GOOGLE POPUP CONTAINER ==== */
      .calendar-popup-overlay.google-dark-theme .popup-container {
        background: #202124 !important;
        border: 1px solid rgba(66, 133, 244, 0.3);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.6),
          0 0 60px rgba(66, 133, 244, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
      }

      .calendar-popup-overlay.google-light-theme .popup-container {
        background: linear-gradient(135deg, rgba(248, 251, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(248, 250, 252, 0.98) 100%);
        border: 1px solid rgba(218, 220, 224, 0.8);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.08),
          0 0 60px rgba(66, 133, 244, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
      }

      .calendar-popup-overlay .popup-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.05) 0%, transparent 50%);
        pointer-events: none;
        border-radius: 20px;
      }

      .calendar-popup-overlay.light-theme .popup-container::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
      }

      /* ==== EFFETTI DECORATIVI GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .popup-container::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(66, 133, 244, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(52, 168, 83, 0.06) 0%, transparent 50%);
      }

      .calendar-popup-overlay.google-light-theme .popup-container::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(66, 133, 244, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(52, 168, 83, 0.04) 0%, transparent 50%);
      }

      .calendar-popup-overlay .popup-side {
        flex: 1;
        padding: 24px;
        max-height: 80vh;
        overflow-y: auto;
        color: #ffffff;
        position: relative;
        z-index: 1;
      }

      .calendar-popup-overlay.light-theme .popup-side {
        color: #1a202c;
      }

      /* ==== COLORI TESTO GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .popup-side {
        color: #ffffff;
      }

      .calendar-popup-overlay.google-light-theme .popup-side {
        color: #3c4043;
      }

      .calendar-popup-overlay .popup-side:first-child {
        border-right: 1px solid rgba(0, 212, 255, 0.2);
      }

      .calendar-popup-overlay.light-theme .popup-side:first-child {
        border-right: 1px solid rgba(59, 130, 246, 0.3);
      }

      /* ==== BORDI GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .popup-side:first-child {
        border-right: 1px solid rgba(66, 133, 244, 0.3);
      }

      .calendar-popup-overlay.google-light-theme .popup-side:first-child {
        border-right: 1px solid rgba(218, 220, 224, 0.6);
      }

      .calendar-popup-overlay .popup-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 24px;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .calendar-popup-overlay .popup-close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.2s ease;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        line-height: 1;
      }

      .calendar-popup-overlay .popup-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        transform: scale(1.1);
      }

      .calendar-popup-overlay.light-theme .popup-title {
        color: #1a202c;
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
      }

      .calendar-popup-overlay.light-theme .popup-close-btn {
        color: rgba(30, 41, 59, 0.7);
      }

      .calendar-popup-overlay.light-theme .popup-close-btn:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #1a202c;
      }

      /* ==== TITOLI GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .popup-title {
        background: linear-gradient(135deg, #ffffff 0%, #e8eaed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: none;
        font-weight: 600;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: none;
      }

      .calendar-popup-overlay.google-light-theme .popup-title {
        color: #202124;
        text-shadow: none;
        font-weight: 600;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: none;
      }

      .calendar-popup-overlay.google-dark-theme .popup-close-btn {
        color: rgba(255, 255, 255, 0.7);
      }

      .calendar-popup-overlay.google-dark-theme .popup-close-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .calendar-popup-overlay.google-light-theme .popup-close-btn {
        color: rgba(60, 64, 67, 0.7);
      }

      .calendar-popup-overlay.google-light-theme .popup-close-btn:hover {
        background: rgba(60, 64, 67, 0.08);
        color: #202124;
      }


      .calendar-popup-overlay .event-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .calendar-popup-overlay .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .calendar-popup-overlay .form-group label {
        font-size: 14px;
        color: rgba(0, 212, 255, 0.9);
        opacity: 1;
        font-weight: 600;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .calendar-popup-overlay.light-theme .form-group label {
        color: rgba(59, 130, 246, 0.9);
        text-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
      }

      /* ==== ETICHETTE FORM GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .form-group label {
        color: #ffffff;
        text-shadow: none;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        font-weight: 500;
        letter-spacing: 0.3px;
        text-transform: none;
        opacity: 0.9;
      }

      .calendar-popup-overlay.google-light-theme .form-group label {
        color: #3c4043;
        text-shadow: none;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        font-weight: 500;
        letter-spacing: 0.3px;
        text-transform: none;
        opacity: 0.9;
      }

      .calendar-popup-overlay .form-group input,
      .calendar-popup-overlay .form-group textarea {
        padding: 12px 16px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 212, 255, 0.05));
        color: #ffffff;
        font-size: 14px;
        font-family: 'Roboto', sans-serif;
        transition: all 0.3s ease;
        box-shadow:
          0 2px 10px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.light-theme .form-group input,
      .calendar-popup-overlay.light-theme .form-group textarea {
        border: 1px solid rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(59, 130, 246, 0.05));
        color: #1a202c;
        box-shadow:
          0 2px 10px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      /* ==== INPUT FORM GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .form-group input,
      .calendar-popup-overlay.google-dark-theme .form-group textarea,
      .calendar-popup-overlay.google-dark-theme .form-group select {
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        backdrop-filter: blur(10px);
        border-radius: 8px;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      }

      .calendar-popup-overlay.google-light-theme .form-group input,
      .calendar-popup-overlay.google-light-theme .form-group textarea,
      .calendar-popup-overlay.google-light-theme .form-group select {
        border: 1px solid #dadce0;
        background: #ffffff;
        color: #3c4043;
        border-radius: 8px;
        font-family: 'Google Sans', 'Roboto', sans-serif;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }

      .calendar-popup-overlay .form-group input:focus,
      .calendar-popup-overlay .form-group textarea:focus {
        outline: none;
        border-color: rgba(0, 212, 255, 0.6);
        box-shadow:
          0 2px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 212, 255, 0.08));
      }

      .calendar-popup-overlay.light-theme .form-group input:focus,
      .calendar-popup-overlay.light-theme .form-group textarea:focus {
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow:
          0 2px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(59, 130, 246, 0.08));
      }

      /* ==== STATO FOCUS GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .form-group input:focus,
      .calendar-popup-overlay.google-dark-theme .form-group textarea:focus,
      .calendar-popup-overlay.google-dark-theme .form-group select:focus {
        outline: none;
        border-color: #4285f4;
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2), 0 2px 15px rgba(0, 0, 0, 0.4);
      }

      .calendar-popup-overlay.google-light-theme .form-group input:focus,
      .calendar-popup-overlay.google-light-theme .form-group textarea:focus,
      .calendar-popup-overlay.google-light-theme .form-group select:focus {
        outline: none;
        border-color: #4285f4;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1), 0 2px 15px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay .all-day-checkbox {
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        padding: 0 !important;
        appearance: none;
        -webkit-appearance: none;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 212, 255, 0.05));
        border: 2px solid rgba(0, 212, 255, 0.3);
        border-radius: 4px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.light-theme .all-day-checkbox {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(59, 130, 246, 0.05));
        border: 2px solid rgba(59, 130, 246, 0.4);
        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .calendar-popup-overlay .all-day-checkbox:checked {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(0, 212, 255, 0.8);
        box-shadow:
          0 2px 12px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .calendar-popup-overlay.light-theme .all-day-checkbox:checked {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(124, 58, 237, 0.8));
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow:
          0 2px 12px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .calendar-popup-overlay .all-day-checkbox:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
      }

      .calendar-popup-overlay .all-day-checkbox:hover {
        border-color: rgba(0, 212, 255, 0.6);
        box-shadow:
          0 2px 12px rgba(0, 0, 0, 0.3),
          0 0 15px rgba(0, 212, 255, 0.2);
      }

      .calendar-popup-overlay.light-theme .all-day-checkbox:hover {
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow:
          0 2px 12px rgba(0, 0, 0, 0.1),
          0 0 15px rgba(59, 130, 246, 0.3);
      }

      /* ==== CHECKBOX GOOGLE ==== */
      .calendar-popup-overlay.google-dark-theme .all-day-checkbox {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .calendar-popup-overlay.google-light-theme .all-day-checkbox {
        background: #ffffff;
        border: 2px solid #dadce0;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay.google-dark-theme .all-day-checkbox:checked {
        background: #4285f4;
        border-color: #4285f4;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(66, 133, 244, 0.3);
      }

      .calendar-popup-overlay.google-light-theme .all-day-checkbox:checked {
        background: #4285f4;
        border-color: #4285f4;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 20px rgba(66, 133, 244, 0.2);
      }

      .calendar-popup-overlay.google-dark-theme .all-day-checkbox:hover {
        border-color: rgba(66, 133, 244, 0.6);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 15px rgba(66, 133, 244, 0.3);
      }

      .calendar-popup-overlay.google-light-theme .all-day-checkbox:hover {
        border-color: #4285f4;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 15px rgba(66, 133, 244, 0.2);
      }

      .calendar-popup-overlay .form-group textarea {
        min-height: 20px;
        resize: vertical;
      }

      .calendar-popup-overlay .event-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }

      .calendar-popup-overlay .btn {
        padding: 12px 24px;
        border: 1px solid;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .calendar-popup-overlay .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .calendar-popup-overlay .btn-primary {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(0, 212, 255, 0.6);
        color: white;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
      }

      .calendar-popup-overlay .btn-danger {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(236, 72, 153, 0.6);
        color: white;
        text-shadow: 0 0 5px rgba(236, 72, 153, 0.3);
      }

      .calendar-popup-overlay .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }

      .calendar-popup-overlay .btn:hover::before {
        left: 100%;
      }

      .calendar-popup-overlay .btn-primary:hover {
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(0, 212, 255, 0.3);
      }

      .calendar-popup-overlay .btn-danger:hover {
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(236, 72, 153, 0.3);
      }

      .calendar-popup-overlay .btn-warning {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(255, 165, 0, 0.6);
        color: white;
        text-shadow: 0 0 5px rgba(255, 165, 0, 0.3);
      }

      .calendar-popup-overlay .btn-warning:hover {
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(255, 165, 0, 0.3);
      }

      .calendar-popup-overlay .events-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .calendar-popup-overlay .event-item {
        background: #202124;
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        position: relative;
        transition: all 0.3s ease;
        backdrop-filter: blur(5px);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .calendar-popup-overlay.light-theme .event-item {
          background: linear-gradient(135deg, rgb(250 250 250 / 10%), rgb(124 58 237 / 0%)) !important;
        border: 1px solid rgba(59, 130, 246, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .calendar-popup-overlay.google-light-theme .event-item {
          background: #f8f9fa !important;
          border: 1px solid rgba(60, 64, 67, 0.12) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }
      .calendar-popup-overlay .event-item:hover {
        transform: translateY(-2px);
        border-color: rgba(0, 212, 255, 0.4);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.1);
      }

      .calendar-popup-overlay.light-theme .event-item:hover {
        border-color: rgba(59, 130, 246, 0.5);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.2);
      }

      .calendar-popup-overlay .event-item-title {
        font-weight: 700;
        margin-bottom: 8px;
        color: var(--text-color);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
      }

      .calendar-popup-overlay.light-theme .event-item-title {
        color: #1a202c;
        text-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
      }

      .calendar-popup-overlay .event-item-time {
        font-size: 13px;
        color: rgba(0, 212, 255, 0.8);
        margin-bottom: 8px;
        font-weight: 600;
        text-shadow: 0 0 3px rgba(0, 212, 255, 0.2);
      }

      .calendar-popup-overlay.light-theme .event-item-time {
        color: rgba(59, 130, 246, 0.9);
        text-shadow: 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .calendar-popup-overlay .event-item-description {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
      }

      .calendar-popup-overlay.light-theme .event-item-description {
        color: rgba(30, 41, 59, 0.9);
      }

      .calendar-popup-overlay .event-item-actions {
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 40px;
      }

      .calendar-popup-overlay .event-item-edit,
      .calendar-popup-overlay .event-item-delete,
      .calendar-popup-overlay .event-item-notifications {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(147, 51, 234, 0.2));
        border: 1px solid rgba(0, 212, 255, 0.4);
        color: rgba(0, 212, 255, 0.9);
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 12px;
        font-weight: bold;
        width: 24px;
        height: 24px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }

      .calendar-popup-overlay.light-theme .event-item-edit {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2));
        border: 1px solid rgba(59, 130, 246, 0.4);
        color: rgba(59, 130, 246, 0.9);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay .event-item-delete {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(147, 51, 234, 0.2));
        border-color: rgba(236, 72, 153, 0.4);
        color: rgba(236, 72, 153, 0.9);
      }

      .calendar-popup-overlay .event-item-notifications {
        background: linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(147, 51, 234, 0.2));
        border-color: rgba(100, 100, 100, 0.4);
      }

      .calendar-popup-overlay.light-theme .event-item-delete {
        background: linear-gradient(135deg, rgba(219, 39, 119, 0.2), rgba(124, 58, 237, 0.2));
        border-color: rgba(219, 39, 119, 0.4);
        color: rgba(219, 39, 119, 0.9);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay.light-theme .event-item-notifications {
        background: linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(124, 58, 237, 0.2));
        border-color: rgba(100, 100, 100, 0.4);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .calendar-popup-overlay .event-item-edit:hover {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(147, 51, 234, 0.4));
        color: #ffffff;
        transform: scale(1.1);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(0, 212, 255, 0.3);
      }

      .calendar-popup-overlay.light-theme .event-item-edit:hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(124, 58, 237, 0.4));
        color: #ffffff;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(59, 130, 246, 0.3);
      }

      .calendar-popup-overlay .event-item-delete:hover {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(147, 51, 234, 0.4));
        color: #ffffff;
        transform: scale(1.1);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(236, 72, 153, 0.3);
      }

      .calendar-popup-overlay.light-theme .event-item-delete:hover {
        background: linear-gradient(135deg, rgba(219, 39, 119, 0.4), rgba(124, 58, 237, 0.4));
        color: #ffffff;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(219, 39, 119, 0.3);
      }

      .calendar-popup-overlay .event-item-notifications:hover {
        background: linear-gradient(135deg, rgba(200, 200, 200, 0.4), rgba(147, 51, 234, 0.4)) !important;
        color: #ffffff !important;
        transform: scale(1.1);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(200, 200, 200, 0.3);
      }

      .calendar-popup-overlay.light-theme .event-item-notifications:hover {
        background: linear-gradient(135deg, rgba(150, 150, 150, 0.4), rgba(124, 58, 237, 0.4)) !important;
        color: #ffffff !important;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(150, 150, 150, 0.3);
      }

      .calendar-popup-overlay .no-events {
          text-align: center;
          padding: 32px 24px;
          color: rgb(127 127 127 / 60%);
          font-family: 'Orbitron', 'Roboto', sans-serif;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border: 1px dashed rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.03), rgba(147, 51, 234, 0.03));
      }

      .calendar-popup-overlay.light-theme .no-events {
        color: rgba(30, 41, 59, 0.7);
        border: 1px dashed rgba(59, 130, 246, 0.3);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(124, 58, 237, 0.05));
      }

      @keyframes flashIn {
        0% {
          opacity: 0;
          transform: translateY(-10px) scale(0.8);
        }
        50% {
          opacity: 1;
          transform: translateY(0) scale(1.1);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .settings-popup {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        border: 1px solid rgba(255, 165, 0, 0.4);
        border-radius: 20px;
        width: 90%;
        max-width: 500px;
        padding: 32px;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(255, 165, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
        color: #ffffff;
        animation: settingsPopupIn 0.3s ease;
      }

      .settings-popup-overlay.light-theme .settings-popup {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        border: 1px solid rgba(251, 146, 60, 0.4);
        color: #1a202c;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 60px rgba(251, 146, 60, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      @keyframes settingsPopupIn {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .settings-popup::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          radial-gradient(circle at 20% 50%, rgba(255, 165, 0, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.05) 0%, transparent 50%);
        pointer-events: none;
        border-radius: 20px;
      }

      .settings-popup-overlay.light-theme .settings-popup::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(251, 146, 60, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
      }

      .settings-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 24px;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-shadow: 0 0 10px rgba(255, 165, 0, 0.3);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        text-transform: uppercase;
        position: relative;
        z-index: 1;
      }

      .settings-popup-overlay.light-theme .settings-title {
        color: #1a202c;
        text-shadow: 0 0 10px rgba(251, 146, 60, 0.2);
      }

      .settings-section {
        margin-bottom: 24px;
        position: relative;
        z-index: 1;
      }

      .settings-label {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: rgba(255, 165, 0, 0.9);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-shadow: 0 0 5px rgba(255, 165, 0, 0.3);
      }

      .settings-popup-overlay.light-theme .settings-label {
        color: rgba(251, 146, 60, 0.9);
        text-shadow: 0 0 5px rgba(251, 146, 60, 0.2);
      }

      .theme-selector {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .theme-option {
        flex: 1;
        min-width: 120px;
        padding: 16px;
        border: 2px solid rgba(255, 165, 0, 0.3);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(255, 165, 0, 0.05));
        color: #ffffff;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
        font-weight: 600;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        position: relative;
        overflow: hidden;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .settings-popup-overlay.light-theme .theme-option {
        border: 2px solid rgba(251, 146, 60, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(251, 146, 60, 0.05));
        color: #1a202c;
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .theme-option::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .theme-option:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 165, 0, 0.6);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(255, 165, 0, 0.2);
      }

      .settings-popup-overlay.light-theme .theme-option:hover {
        border-color: rgba(251, 146, 60, 0.8);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(251, 146, 60, 0.3);
      }

      .theme-option:hover::before {
        left: 100%;
      }

      .theme-option.active {
        border-color: rgba(255, 165, 0, 0.8);
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2));
        box-shadow:
          0 6px 25px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(255, 165, 0, 0.3),
          inset 0 2px 0 rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }



      /* SCHERMATA CONFIGURAZIONE INIZIALE */
      .setup-container {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        background-size: 400% 400%;
        animation: futuristicBg 8s ease infinite;
        padding: 32px;
        border-radius: 20px;
        color: #ffffff;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 0 60px rgba(255, 165, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 165, 0, 0.3);
        position: relative;
        overflow: hidden;
        max-width: 600px;
        margin: 0 auto;
      }

      .setup-container.light-theme {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        color: #1a202c;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 60px rgba(251, 146, 60, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(251, 146, 60, 0.4);
      }

      .setup-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background:
          radial-gradient(circle at 20% 50%, rgba(255, 165, 0, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.08) 0%, transparent 50%);
        pointer-events: none;
      }

      .setup-container.light-theme::before {
        background:
          radial-gradient(circle at 20% 50%, rgba(251, 146, 60, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 50%);
      }

      .setup-title {
        font-size: 32px;
        font-weight: 700;
        text-align: center;
        margin-bottom: 16px;
        background: linear-gradient(45deg, #ffa500, #9333ea, #ec4899, #ffa500);
        background-size: 300% 300%;
        animation: neonText 3s ease infinite;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow:
          0 0 15px rgba(255, 165, 0, 0.5),
          0 0 30px rgba(255, 165, 0, 0.3);
        text-transform: uppercase;
        letter-spacing: 2px;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        position: relative;
        z-index: 1;
      }

      .setup-container.light-theme .setup-title {
        background: linear-gradient(45deg, #fb923c, #7c3aed, #db2777, #fb923c);
        text-shadow:
          0 0 15px rgba(251, 146, 60, 0.3),
          0 0 30px rgba(251, 146, 60, 0.2);
      }

      .setup-subtitle {
        text-align: center;
        font-size: 16px;
        margin-bottom: 32px;
        color: rgba(255, 165, 0, 0.8);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        position: relative;
        z-index: 1;
      }

      .setup-container.light-theme .setup-subtitle {
        color: rgba(251, 146, 60, 0.9);
      }

      .setup-section {
        margin-bottom: 32px;
        position: relative;
        z-index: 1;
      }

      .setup-section-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #ffffff;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 1px;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .setup-container.light-theme .setup-section-title {
        color: #1a202c;
      }

      .calendar-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;
        padding: 16px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(255, 165, 0, 0.05));
        border-radius: 12px;
        border: 1px solid rgba(255, 165, 0, 0.2);
      }

      .setup-container.light-theme .calendar-list {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(251, 146, 60, 0.05));
        border: 1px solid rgba(251, 146, 60, 0.3);
      }

      .calendar-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.1), rgba(147, 51, 234, 0.1));
        border: 1px solid rgba(255, 165, 0, 0.2);
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .setup-container.light-theme .calendar-item {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(124, 58, 237, 0.1));
        border: 1px solid rgba(251, 146, 60, 0.3);
      }

      .calendar-item:hover {
        transform: translateY(-2px);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(255, 165, 0, 0.2);
        border-color: rgba(255, 165, 0, 0.4);
      }

      .setup-container.light-theme .calendar-item:hover {
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(251, 146, 60, 0.2);
        border-color: rgba(251, 146, 60, 0.5);
      }

      .calendar-item.selected {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2));
        border-color: rgba(255, 165, 0, 0.6);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(255, 165, 0, 0.3);
      }

      .setup-container.light-theme .calendar-item.selected {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(124, 58, 237, 0.2));
        border-color: rgba(251, 146, 60, 0.6);
        box-shadow:
          0 4px 15px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(251, 146, 60, 0.3);
      }

      .calendar-checkbox {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 165, 0, 0.5);
        border-radius: 4px;
        background: transparent;
        position: relative;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .setup-container.light-theme .calendar-checkbox {
        border-color: rgba(251, 146, 60, 0.6);
      }

      .calendar-checkbox.checked {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(255, 165, 0, 0.8);
      }

      .setup-container.light-theme .calendar-checkbox.checked {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.8), rgba(124, 58, 237, 0.8));
        border-color: rgba(251, 146, 60, 0.8);
      }

      .calendar-checkbox.checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff;
        font-size: 14px;
        font-weight: bold;
      }

      .calendar-info {
        flex: 1;
      }

      .calendar-name {
        font-weight: 600;
        margin-bottom: 4px;
        color: #ffffff;
      }

      .setup-container.light-theme .calendar-name {
        color: #1a202c;
      }

      .calendar-entity {
        font-size: 12px;
        color: rgba(255, 165, 0, 0.7);
        font-family: 'Monaco', 'Consolas', monospace;
      }

      .setup-container.light-theme .calendar-entity {
        color: rgba(251, 146, 60, 0.7);
      }

      .primary-badge {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(147, 51, 234, 0.8));
        color: #ffffff;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .setup-container.light-theme .primary-badge {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(124, 58, 237, 0.8));
      }

      .primary-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.4);
      }

      .setup-actions {
        display: flex;
        gap: 16px;
        margin-top: 32px;
        position: relative;
        z-index: 1;
      }

      .setup-button {
        flex: 1;
        padding: 16px 24px;
        border: 1px solid rgba(255, 165, 0, 0.6);
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.8), rgba(147, 51, 234, 0.8));
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        text-shadow: 0 0 5px rgba(255, 165, 0, 0.3);
      }

      .setup-container.light-theme .setup-button {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.8), rgba(124, 58, 237, 0.8));
        border: 1px solid rgba(251, 146, 60, 0.6);
        text-shadow: 0 0 5px rgba(251, 146, 60, 0.3);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }

      .setup-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .setup-button:hover {
        transform: translateY(-2px);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(255, 165, 0, 0.3);
      }

      .setup-container.light-theme .setup-button:hover {
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.1),
          0 0 30px rgba(251, 146, 60, 0.3);
      }

      .setup-button:hover::before {
        left: 100%;
      }

      .setup-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .setup-button:disabled:hover::before {
        left: -100%;
      }

      .no-calendars {
        text-align: center;
        padding: 32px;
        color: rgba(255, 165, 0, 0.6);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        font-style: italic;
      }

      .setup-container.light-theme .no-calendars {
        color: rgba(251, 146, 60, 0.7);
      }

      /* RESPONSIVE DESIGN per popup eventi */
      @media (max-width: 768px) {
        .calendar-popup-overlay .popup-container {
          flex-direction: column;
          width: 95%;
          max-height: 90vh;
        }

        .calendar-popup-overlay .popup-side {
          padding: 16px;
          max-height: none;
        }

        .calendar-popup-overlay .popup-side:last-child {
          display: none;
        }

        .calendar-popup-overlay.light-theme .popup-side:first-child {
          border-right: none;
          border-bottom: none;
        }

        .mobile-events-toggle {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(147, 51, 234, 0.2));
          border: 1px solid rgba(0, 212, 255, 0.4);
          color: rgba(0, 212, 255, 0.9);
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          margin-top: 16px;
          width: 100%;
          transition: all 0.3s ease;
        }

        .mobile-events-toggle:hover {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(147, 51, 234, 0.4));
        }

        .mobile-events-list {
          display: none;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
        }

        .mobile-events-list.active {
          display: block;
        }

        .mobile-events-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: rgba(0, 212, 255, 0.9);
        }

        .calendar-popup-overlay.light-theme .mobile-events-toggle {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2));
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: rgba(59, 130, 246, 0.9);
        }

        .calendar-popup-overlay.light-theme .mobile-events-toggle:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(124, 58, 237, 0.4));
        }

        .calendar-popup-overlay.light-theme .mobile-events-list {
          border-top: 1px solid rgba(59, 130, 246, 0.2);
        }

        .calendar-popup-overlay.light-theme .mobile-events-title {
          color: rgba(59, 130, 246, 0.9);
        }

        .calendar-popup-overlay.google-light-theme .mobile-events-toggle {
          background: rgba(66, 133, 244, 0.1);
          border: 1px solid rgba(66, 133, 244, 0.3);
          color: #4285f4;
        }

        .calendar-popup-overlay.google-light-theme .mobile-events-toggle:hover {
          background: rgba(66, 133, 244, 0.2);
        }

        .calendar-popup-overlay.google-light-theme .mobile-events-list {
          border-top: 1px solid rgba(66, 133, 244, 0.2);
        }

        .calendar-popup-overlay.google-light-theme .mobile-events-title {
          color: #4285f4;
        }
      }

      /* Nascondi sezione mobile su desktop */
      @media (min-width: 769px) {
        .mobile-events-toggle,
        .mobile-events-list {
          display: none !important;
        }
        }

        .calendar-popup-overlay .popup-title {
          font-size: 16px;
          margin-bottom: 16px;
        }

        .calendar-popup-overlay .form-group {
          gap: 6px;
        }

        .calendar-popup-overlay .form-group label {
          font-size: 12px;
        }

        .calendar-popup-overlay .form-group input,
        .calendar-popup-overlay .form-group textarea {
          padding: 10px 12px;
          font-size: 14px;
        }
      }

      @media (max-width: 480px) {
        .calendar-popup-overlay .popup-container {
          width: 98%;
          margin: 10px;
          border-radius: 15px;
        }

        .calendar-popup-overlay .popup-side {
          padding: 12px;
        }

        .calendar-popup-overlay .popup-title {
          font-size: 14px;
          margin-bottom: 12px;
          flex-direction: column;
          gap: 8px;
          text-align: center;
        }


        .calendar-popup-overlay .form-group {
          gap: 4px;
        }

        .calendar-popup-overlay .form-group label {
          font-size: 11px;
          flex-wrap: wrap;
        }

        .calendar-popup-overlay .form-group input,
        .calendar-popup-overlay .form-group textarea,
        .calendar-popup-overlay .form-group select {
          padding: 8px 10px;
          font-size: 13px;
        }

        .calendar-popup-overlay .event-item {
          padding: 8px;
        }

        .calendar-popup-overlay .event-item-title {
          font-size: 13px;
          line-height: 1.3;
        }

        .calendar-popup-overlay .event-item-time {
          font-size: 11px;
        }

        .calendar-popup-overlay .event-item-actions {
          gap: 4px;
          margin-top: 20px;
        }

        .calendar-popup-overlay .event-item-actions button {
          padding: 4px 6px;
          font-size: 12px;
        }

        /* Notifiche responsive */
        .notification-group {
          margin: 8px 0 !important;
        }

        .notification-timing {
          margin-left: 16px !important;
        }

        .custom-timing-input > div {
          flex-direction: column !important;
          gap: 6px !important;
        }

        .custom-timing-value {
          width: 100% !important;
        }
      }
    `;
  }

  async _showEventPopup(date) {


    // Rimuovi eventuali popup già aperti
    const existingPopups = document.querySelectorAll('.calendar-popup-overlay');
    existingPopups.forEach(p => {

      p.remove();
    });

    // Carica i dispositivi disponibili prima di creare il popup
    await this._loadAvailableDevices();

    const popup = document.createElement('div');
        popup.className = `popup-overlay calendar-popup-overlay ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}`;

    try {
    popup.innerHTML = this._getPopupContent(date);

    } catch (error) {
      console.error('❌ Errore nella generazione contenuto popup:', error);
      return;
    }

    // Aggiungi stili del popup al document head se non già presenti
    if (!document.querySelector('#calendar-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'calendar-popup-styles';
      style.textContent = this._getPopupStyles();
      document.head.appendChild(style);

    }

    // Click sul background per chiudere
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {

        this._cleanupPopup();
        popup.remove();
      }
    });

    // Handler per sincronizzazione nel popup
    popup.__syncHandler = async () => {

      try {
        await this._handleManualSync();
        setTimeout(() => {
          this._updateEventListInPopup(popup, date);
        }, 1000);
      } catch (error) {
        console.error('Errore sync popup:', error);
      }
    };

    // Aggiungi al body
    document.body.appendChild(popup);


    // Anima entrata
    popup.style.opacity = '0';
    popup.style.transform = 'scale(0.9)';

    // Forza reflow per transizione
    popup.offsetHeight;

    popup.style.transition = 'all 0.3s ease';
    popup.style.opacity = '1';
    popup.style.transform = 'scale(1)';

    // Attacca listeners dopo che il popup è nel DOM
    setTimeout(() => {
      try {
        this._attachPopupEventListeners(popup, date);

      } catch (error) {
        console.error('❌ Errore attach listeners:', error);
      }
    }, 100);


  }



  _getEventsForDay(date) {
    if (!this._events) return [];

    return this._events.filter(event => {
      // Gestisci i diversi formati di data per l'inizio
      let eventStartDate;

      if (typeof event.start === 'string') {
        // Formato stringa diretta: "2025-06-30" o "2025-06-30T09:00:00"
        eventStartDate = new Date(event.start);
      } else if (event.start && typeof event.start === 'object') {
        // Formato oggetto: {date: "2025-06-30"} o {dateTime: "2025-06-30T09:00:00"}
        if (event.start.date) {
          eventStartDate = new Date(event.start.date);
        } else if (event.start.dateTime) {
          eventStartDate = new Date(event.start.dateTime);
        } else {
          console.warn('Evento con formato start non riconosciuto:', event);
          return false;
        }
      } else {
        console.warn('Evento senza campo start valido:', event);
        return false;
      }

      // Verifica che la data di inizio sia valida
      if (isNaN(eventStartDate.getTime())) {
        console.warn('Data evento non valida:', event.start);
        return false;
      }

      // Gestisci i diversi formati di data per la fine
      let eventEndDate;

      if (typeof event.end === 'string') {
        // Formato stringa diretta: "2025-06-30" o "2025-06-30T09:00:00"
        eventEndDate = new Date(event.end);
      } else if (event.end && typeof event.end === 'object') {
        // Formato oggetto: {date: "2025-06-30"} o {dateTime: "2025-06-30T09:00:00"}
        if (event.end.date) {
          eventEndDate = new Date(event.end.date);
        } else if (event.end.dateTime) {
          eventEndDate = new Date(event.end.dateTime);
        } else {
          console.warn('Evento con formato end non riconosciuto:', event);
          eventEndDate = eventStartDate; // Fallback: usa la data di inizio
        }
      } else {
        // Se non c'è data di fine, usa la data di inizio (evento di un giorno)
        eventEndDate = eventStartDate;
      }

      // Verifica che la data di fine sia valida
      if (isNaN(eventEndDate.getTime())) {
        console.warn('Data fine evento non valida:', event.end);
        eventEndDate = eventStartDate; // Fallback: usa la data di inizio
      }

      // Normalizza le date per il confronto (solo giorno, mese, anno)
      const requestedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDate = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
      const endDate = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());

      // Per eventi "tutto il giorno" che finiscono alla mezzanotte del giorno successivo,
      // sottrai un giorno dalla data di fine per evitare che l'evento appaia nel giorno successivo
      if (event.isAllDay || (event.end && event.end.date && !event.end.dateTime)) {
        if (endDate.getTime() > startDate.getTime()) {
          endDate.setDate(endDate.getDate() - 1);
        }
      }

      // Controlla se la data richiesta è nel range dell'evento (inclusi inizio e fine)
      return requestedDate.getTime() >= startDate.getTime() &&
             requestedDate.getTime() <= endDate.getTime();
    });
  }

  _getPopupContent(date) {
    const events = this._getEventsForDay(date);
    const locale = this._language === 'it' ? 'it-IT' : 'en-US';
    const dateStr = date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Impostiamo sempre gli stessi valori predefiniti: 09:00-10:00
    const defaultTimes = this._getDefaultEventTimes(date);
    const defaultStart = defaultTimes.start;
    const defaultEnd = defaultTimes.end;

    return `
      <div class="popup-container">
        <div class="popup-side">
          <div class="popup-title">
            <span>${this._t('addEvent')} - ${dateStr}</span>
            <button class="popup-close-btn" onclick="this.closest('.popup-overlay').remove()">✕</button>
          </div>
          <form class="event-form">
            <div class="form-group">
              <label>${this._t('eventTitle')}</label>
              <input type="text" class="event-title" required>
            </div>
            <div class="form-group">
              <label>${this._t('eventDescription')}</label>
              <textarea class="event-description"></textarea>
            </div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" class="all-day-checkbox" style="width: auto; height: auto;">
                <span>${this._t('allDay')}</span>
              </label>
            </div>
            <div class="form-group datetime-group">
              <label class="datetime-label">${this._t('datetimeStart')}</label>
              <input type="datetime-local" class="event-start" required value="${defaultStart}">
              <input type="date" class="event-start-date" style="display: none;" value="${date.toISOString().split('T')[0]}">
            </div>
            <div class="form-group datetime-group">
              <label class="datetime-label">${this._t('datetimeEnd')}</label>
              <input type="datetime-local" class="event-end" required value="${defaultEnd}">
              <input type="date" class="event-end-date" style="display: none;" value="${date.toISOString().split('T')[0]}">
            </div>
            <!-- Sezione Notifiche -->
            <div class="form-group notifications-section" style="border-top: 1px solid rgba(0, 212, 255, 0.2); padding-top: 16px; margin-top: 16px;">
              <!-- Notifiche Push -->
              ${this._notificationSettings.mobile_enabled ? `
                <div class="notification-group" style="margin: 12px 0;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
                    <input type="checkbox" class="push-notification-checkbox" style="width: auto; height: auto;">
                    <span><ha-icon icon="mdi:cellphone"></ha-icon> ${this._t('pushNotification')}</span>
                  </label>
                  <div class="notification-timing" style="margin-left: 24px; display: none;">
                    <select class="push-notification-timing" style="margin: 4px 0; padding: 4px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                      <option value="5">${this._t('minutesBefore5')}</option>
                      <option value="15" selected>${this._t('minutesBefore15')}</option>
                      <option value="30">${this._t('minutesBefore30')}</option>
                      <option value="60">${this._t('hourBefore1')}</option>
                      <option value="120">${this._t('hoursBefore2')}</option>
                      <option value="360">${this._t('hoursBefore6')}</option>
                      <option value="720">${this._t('hoursBefore12')}</option>
                      <option value="1440">${this._t('dayBefore1')}</option>
                      <option value="2880">${this._t('daysBefore2')}</option>
                      <option value="4320">${this._t('daysBefore3')}</option>
                      <option value="10080">${this._t('weekBefore1')}</option>
                      <option value="20160">${this._t('weeksBefore2')}</option>
                      <option value="custom">⏰ ${this._t('custom')}...</option>
                    </select>
                    <div class="custom-timing-input" style="display: none; margin-top: 8px;">
                      <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; border: 1px solid rgba(0, 212, 255, 0.2);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <label style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">${this._t('notificationTime')}:</label>
                          <input type="time" class="custom-notification-time" style="padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; width: 100%;" value="09:00">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <label style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">${this._t('when')}:</label>
                          <select class="custom-days-before" style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                            <option value="0">${this._t('sameDay')}</option>
                            <option value="1">${this._t('oneDayBefore')}</option>
                            <option value="2">${this._t('twoDaysBefore')}</option>
                            <option value="3">${this._t('threeDaysBefore')}</option>
                            <option value="custom">${this._t('customDaysBefore')}</option>
                          </select>
                          <input type="number" class="custom-days-value" min="0" max="365" placeholder="Giorni" style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; display: none; margin-top: 4px;">
                        </div>
                      </div>
                    </div>
                    </div>
                    ${this._availableDevices?.mobile?.length > 0 ? `
                      <select class="push-notification-device" style="margin: 4px 0; padding: 4px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                        ${this._availableDevices.mobile.map(device => `
                          <option value="${device.service}">${device.name}</option>
                        `).join('')}
                      </select>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Notifiche Alexa -->
              ${this._notificationSettings.alexa_enabled ? `
                <div class="notification-group" style="margin: 12px 0;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
                    <input type="checkbox" class="alexa-notification-checkbox" style="width: auto; height: auto;">
                    <span><ha-icon icon="mdi:microphone"></ha-icon> ${this._t('alexaNotification')}</span>
                  </label>
                  <div class="notification-timing" style="margin-left: 24px; display: none;">
                    <select class="alexa-notification-timing" style="margin: 4px 0; padding: 4px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                      <option value="5">${this._t('minutesBefore5')}</option>
                      <option value="15" selected>${this._t('minutesBefore15')}</option>
                      <option value="30">${this._t('minutesBefore30')}</option>
                      <option value="60">${this._t('hourBefore1')}</option>
                      <option value="120">${this._t('hoursBefore2')}</option>
                      <option value="360">${this._t('hoursBefore6')}</option>
                      <option value="720">${this._t('hoursBefore12')}</option>
                      <option value="1440">${this._t('dayBefore1')}</option>
                      <option value="2880">${this._t('daysBefore2')}</option>
                      <option value="4320">${this._t('daysBefore3')}</option>
                      <option value="10080">${this._t('weekBefore1')}</option>
                      <option value="20160">${this._t('weeksBefore2')}</option>
                      <option value="custom">⏰ ${this._t('custom')}...</option>
                    </select>
                    <div class="custom-timing-input" style="display: none; margin-top: 8px;">
                      <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 16px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; border: 1px solid rgba(0, 212, 255, 0.2);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <label style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">${this._t('notificationTime')}:</label>
                          <input type="time" class="custom-notification-time" style="padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; width: 100%;" value="09:00">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <label style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500;">${this._t('when')}:</label>
                          <select class="custom-days-before" style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                            <option value="0">${this._t('sameDay')}</option>
                            <option value="1">${this._t('oneDayBefore')}</option>
                            <option value="2">${this._t('twoDaysBefore')}</option>
                            <option value="3">${this._t('threeDaysBefore')}</option>
                            <option value="custom">${this._t('customDaysBefore')}</option>
                          </select>
                          <input type="number" class="custom-days-value" min="0" max="365" placeholder="Giorni" style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; display: none; margin-top: 4px;">
                        </div>
                      </div>
                    </div>
                    ${this._availableDevices?.alexa?.length > 0 ? `
                      <select class="alexa-notification-device" style="margin: 4px 0; padding: 4px; border-radius: 4px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white;">
                        ${this._availableDevices.alexa.map(device => `
                          <option value="${device.service}">${device.name}</option>
                        `).join('')}
                      </select>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="event-actions">
              <button type="submit" class="btn btn-primary">${this._t('addEvent')}</button>
            </div>
          </form>

          <!-- Sezione Eventi Mobile -->
          <button class="mobile-events-toggle" onclick="this.nextElementSibling.classList.toggle('active'); this.innerHTML = this.innerHTML.includes('▼') ? '▲ ${this._t('hideDayEvents')}' : '▼ ${this._t('showDayEvents')}'">
            ▼ ${this._t('showDayEvents')}
          </button>
          <div class="mobile-events-list">
            <div class="mobile-events-title">${this._t('eventsForDay')}</div>
            ${events.length ? events.map(event => `
              <div class="event-item ${event.notifications && event.notifications.length > 0 ? 'has-notifications' : ''}" data-event-id="${event.id}">
                <div class="event-item-title">
                  ${event.summary}
                </div>
                <div class="event-item-time">
                  ${event.isAllDay ?
                    `<span style="color: rgba(0, 212, 255, 0.9); font-weight: 600;"><ha-icon icon="mdi:calendar-today"></ha-icon> ${this._t('allDay')}</span>` :
                    `${this._formatTime(event.start)} - ${this._formatTime(event.end)}`
                  }
                </div>
                ${event.description ? `
                  <div class="event-item-description">${event.description}</div>
                ` : ''}
                <div class="event-item-actions">
                  ${event.isEditable ? `<button class="event-item-edit" data-event-id="${event.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
                  ${event.isEditable ? `<button class="event-item-notifications" data-event-id="${event.id}" title="Gestisci notifiche" style="color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.9)' : 'rgba(255, 255, 255, 0.6)'}; background: ${event.notifications && event.notifications.length > 0 ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2))' : 'linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(147, 51, 234, 0.2))'}; border-color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.4)' : 'rgba(100, 100, 100, 0.4)'};"><ha-icon icon="mdi:bell"></ha-icon></button>` : ''}
                  ${event.isEditable ? `<button class="event-item-delete" data-event-id="${event.id}">×</button>` : ''}
                </div>
              </div>
            `).join('') : `
              <div class="no-events">${this._t('noEventsThisDay')}</div>
            `}
          </div>
        </div>
        <div class="popup-side">
          <div class="popup-title">
            <span>${this._t('eventsForDay')}</span>
            <button class="popup-close-btn" onclick="this.closest('.popup-overlay').remove()">✕</button>
          </div>
          <div class="events-list">
            ${events.length ? events.map(event => `
              <div class="event-item ${event.notifications && event.notifications.length > 0 ? 'has-notifications' : ''}" data-event-id="${event.id}">
                <div class="event-item-title">
                  ${event.summary}
                </div>
                <div class="event-item-time">
                  ${event.isAllDay ?
                    `<span style="color: rgba(0, 212, 255, 0.9); font-weight: 600;"><ha-icon icon="mdi:calendar-today"></ha-icon> ${this._t('allDay')}</span>` :
                    `${this._formatTime(event.start)} - ${this._formatTime(event.end)}`
                  }
                </div>
                ${event.description ? `
                  <div class="event-item-description">${event.description}</div>
                ` : ''}
                <div class="event-item-actions">
                  ${event.isEditable ? `<button class="event-item-edit" data-event-id="${event.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
                  ${event.isEditable ? `<button class="event-item-notifications" data-event-id="${event.id}" title="Gestisci notifiche" style="color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.9)' : 'rgba(255, 255, 255, 0.6)'}; background: ${event.notifications && event.notifications.length > 0 ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2))' : 'linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(147, 51, 234, 0.2))'}; border-color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.4)' : 'rgba(100, 100, 100, 0.4)'};"><ha-icon icon="mdi:bell"></ha-icon></button>` : ''}
                  ${event.isEditable ? `<button class="event-item-delete" data-event-id="${event.id}">×</button>` : ''}
                </div>
              </div>
            `).join('') : `
              <div class="no-events">${this._t('noEventsThisDay')}</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  _attachPopupEventListeners(popup, date) {


    // Usa setTimeout per garantire che il DOM sia completamente renderizzato
    setTimeout(() => {
      // Close button con tutti i possibili selettori
      const closeBtns = popup.querySelectorAll('.close-button, .popup-close, .close-btn, [data-action="close"]');
      closeBtns.forEach(closeBtn => {
        if (closeBtn && !closeBtn._hasCloseListener) {
          closeBtn._hasCloseListener = true;
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this._cleanupPopup();
            popup.remove();
          });

        }
      });

      // Click fuori dal popup per chiudere
      if (!popup._hasOutsideClickListener) {
        popup._hasOutsideClickListener = true;
        
        let mouseDownTarget = null;
        
        popup.addEventListener('mousedown', (e) => {
          mouseDownTarget = e.target;
        });
        
        popup.addEventListener('click', (e) => {
          // Chiudi solo se il mousedown e click sono sullo stesso target (popup) e non c'è selezione di testo
          if (e.target === popup && mouseDownTarget === popup && !window.getSelection().toString()) {

            this._cleanupPopup();
            popup.remove();
          }
        });
      }

      // All-day checkbox logic
      const allDayCheckbox = popup.querySelector('.all-day-checkbox');
      const datetimeGroups = popup.querySelectorAll('.datetime-group');
      const startInput = popup.querySelector('.event-start');
      const endInput = popup.querySelector('.event-end');
      const startDateInput = popup.querySelector('.event-start-date');
      const endDateInput = popup.querySelector('.event-end-date');
      const dateLabels = popup.querySelectorAll('.datetime-label');

      if (allDayCheckbox && datetimeGroups.length > 0 && !allDayCheckbox._hasAllDayListener) {
        allDayCheckbox._hasAllDayListener = true;
        allDayCheckbox.addEventListener('change', () => {
          if (allDayCheckbox.checked) {
            // Nascondi gli input datetime e mostra quelli date
            startInput.style.display = 'none';
            endInput.style.display = 'none';
            startDateInput.style.display = 'block';
            endDateInput.style.display = 'block';
            
            // Cambia le label
            dateLabels[0].textContent = this._t('dateStart');
            dateLabels[1].textContent = this._t('dateEnd');
            
            // Imposta le date correnti dai valori datetime esistenti
            if (startInput.value) {
              startDateInput.value = startInput.value.split('T')[0];
            }
            if (endInput.value) {
              endDateInput.value = endInput.value.split('T')[0];
            }
          } else {
            // Mostra gli input datetime e nascondi quelli date
            startInput.style.display = 'block';
            endInput.style.display = 'block';
            startDateInput.style.display = 'none';
            endDateInput.style.display = 'none';
            
            // Ripristina le label originali
            dateLabels[0].textContent = this._t('datetimeStart');
            dateLabels[1].textContent = this._t('datetimeEnd');

            // Ripristina sempre gli stessi valori predefiniti per eventi con orario
            const defaultTimes = this._getDefaultEventTimes(date);
            startInput.value = defaultTimes.start;
            endInput.value = defaultTimes.end;
          }
        });
      }

      // Auto-correzione orari: se orario di fine è prima dell'inizio, correggi automaticamente
      if (startInput && endInput && !startInput._hasTimeValidationListener) {
        startInput._hasTimeValidationListener = true;

        // Aggiorna l'orario di fine solo quando si perde il focus dall'input di inizio
        startInput.addEventListener('blur', () => {
          if (!allDayCheckbox.checked && startInput.value) {
            const startTime = new Date(startInput.value);
              const correctedEndTime = new Date(startTime);
            correctedEndTime.setHours(startTime.getHours() + 1);
            correctedEndTime.setMinutes(startTime.getMinutes());

              endInput.value = this._dateToLocalISOString(correctedEndTime);

              // Mostra feedback visivo breve
              endInput.style.background = 'rgba(0, 212, 255, 0.2)';
              setTimeout(() => {
                endInput.style.background = '';
              }, 1000);
            }
        });
      }

      // Notification checkbox logic
      const pushNotificationCheckbox = popup.querySelector('.push-notification-checkbox');
      const alexaNotificationCheckbox = popup.querySelector('.alexa-notification-checkbox');

      if (pushNotificationCheckbox && !pushNotificationCheckbox._hasNotificationListener) {
        pushNotificationCheckbox._hasNotificationListener = true;
        pushNotificationCheckbox.addEventListener('change', () => {
          const timingDiv = pushNotificationCheckbox.closest('.notification-group').querySelector('.notification-timing');
          if (timingDiv) {
            timingDiv.style.display = pushNotificationCheckbox.checked ? 'block' : 'none';
          }
        });
      }

      if (alexaNotificationCheckbox && !alexaNotificationCheckbox._hasNotificationListener) {
        alexaNotificationCheckbox._hasNotificationListener = true;
        alexaNotificationCheckbox.addEventListener('change', () => {
          const timingDiv = alexaNotificationCheckbox.closest('.notification-group').querySelector('.notification-timing');
          if (timingDiv) {
            timingDiv.style.display = alexaNotificationCheckbox.checked ? 'block' : 'none';
          }
        });
      }

      // Custom timing logic per le notifiche PUSH
      const pushTimingSelect = popup.querySelector('.push-notification-timing');
      if (pushTimingSelect && !pushTimingSelect._hasCustomTimingListener) {
        pushTimingSelect._hasCustomTimingListener = true;
        pushTimingSelect.addEventListener('change', () => {
          const customDiv = pushTimingSelect.closest('.notification-timing').querySelector('.custom-timing-input');
          if (customDiv) {
            customDiv.style.display = pushTimingSelect.value === 'custom' ? 'block' : 'none';
          }
        });
      }

      // Logica per i giorni prima personalizzati (Push)
      const pushTimingElement = popup.querySelector('.push-notification-timing');
      if (pushTimingElement) {
        const pushDaysSelect = pushTimingElement.closest('.notification-timing').querySelector('.custom-days-before');
        if (pushDaysSelect && !pushDaysSelect._hasCustomDaysListener) {
          pushDaysSelect._hasCustomDaysListener = true;
          pushDaysSelect.addEventListener('change', () => {
            const customDaysInput = pushDaysSelect.parentElement.querySelector('.custom-days-value');
            if (customDaysInput) {
              customDaysInput.style.display = pushDaysSelect.value === 'custom' ? 'inline-block' : 'none';
            }
          });
        }
      }

      // Custom timing logic per le notifiche ALEXA
      const alexaTimingSelect = popup.querySelector('.alexa-notification-timing');
      if (alexaTimingSelect && !alexaTimingSelect._hasCustomTimingListener) {
        alexaTimingSelect._hasCustomTimingListener = true;
        alexaTimingSelect.addEventListener('change', () => {
          const customDiv = alexaTimingSelect.closest('.notification-timing').querySelector('.custom-timing-input');
          if (customDiv) {
            customDiv.style.display = alexaTimingSelect.value === 'custom' ? 'block' : 'none';
          }
        });
      }

      // Logica per i giorni prima personalizzati (Alexa)
      const alexaTimingElement = popup.querySelector('.alexa-notification-timing');
      if (alexaTimingElement) {
        const alexaDaysSelect = alexaTimingElement.closest('.notification-timing').querySelector('.custom-days-before');
        if (alexaDaysSelect && !alexaDaysSelect._hasCustomDaysListener) {
          alexaDaysSelect._hasCustomDaysListener = true;
          alexaDaysSelect.addEventListener('change', () => {
            const customDaysInput = alexaDaysSelect.parentElement.querySelector('.custom-days-value');
            if (customDaysInput) {
              customDaysInput.style.display = alexaDaysSelect.value === 'custom' ? 'inline-block' : 'none';
            }
          });
        }
      }

      // Form submission - gestisce sia creazione che modifica
    const form = popup.querySelector('.event-form');
      if (form && !form._hasSubmitListener) {
        form._hasSubmitListener = true;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
          e.stopPropagation();

          const isEditing = form.dataset.editingEventId;


          if (isEditing) {
            await this._handleSaveEdit(form, isEditing, date, popup);
          } else {
        await this._handleAddEvent(form, date, popup);
          }
        });

      }

      // Assegna gli event listeners per edit/delete/notifications degli eventi
      this._attachEventListeners(popup, date);

    }, 100);
  }

  async _handleAddEvent(form, date, popup) {
    // Evita elaborazioni multiple simultanee
    if (this._isCreatingEvent) return;
    this._isCreatingEvent = true;

    if (!this._primaryCalendar) {
      alert('Nessun calendario principale configurato');
      this._isCreatingEvent = false;
      return;
    }

    const title = form.querySelector('.event-title').value;
    const description = form.querySelector('.event-description').value;
    let start = form.querySelector('.event-start').value;
    let end = form.querySelector('.event-end').value;
    const isAllDay = form.querySelector('.all-day-checkbox').checked;
    const editingEventId = form.dataset.editingEventId;

    // Se è "tutto il giorno", prendi i valori dai campi date
    if (isAllDay) {
      const startDate = form.querySelector('.event-start-date').value;
      const endDate = form.querySelector('.event-end-date').value;
      
      if (!startDate || !endDate) {
        alert(this._t('fillAllDayDates'));
        this._isCreatingEvent = false;
        return;
      }
      
      // Per eventi tutto il giorno, usa le date selezionate
      start = startDate + 'T00:00';
      end = endDate + 'T23:59';
    }

    if (!title || !start || !end) {
      alert(this._t('fillRequiredFields'));
      this._isCreatingEvent = false;
      return;
    }

    // Auto-correzione silenziosa per eventi NON tutto il giorno
    if (!isAllDay) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Se la fine è prima o uguale all'inizio nello stesso giorno, correggi automaticamente
      if (startDate.toDateString() === endDate.toDateString() && endDate <= startDate) {
        const newEndDate = new Date(startDate);
        newEndDate.setHours(startDate.getHours() + 1);
        newEndDate.setMinutes(startDate.getMinutes());
        end = newEndDate.toISOString();
      }
    }

    try {
      if (editingEventId) {
        // Modifica evento esistente su Google Calendar
        const eventData = {
          summary: title,
          description: description
        };

        if (isAllDay) {
          // Per eventi tutto il giorno, usa le date dai campi input
          const startDateValue = form.querySelector('.event-start-date').value; // "2025-07-12"
          const endDateValue = form.querySelector('.event-end-date').value;     // "2025-07-14"

          // Evento tutto il giorno: usa le date selezionate dall'utente
          eventData.dtstart = startDateValue;

          // Per eventi tutto il giorno in Google Calendar, dtend deve essere il giorno successivo all'ultimo giorno
          const endDate = new Date(endDateValue);
          endDate.setDate(endDate.getDate() + 1); // Aggiungi un giorno
          const endYear = endDate.getFullYear();
          const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(endDate.getDate()).padStart(2, '0');

          eventData.dtend = `${endYear}-${endMonth}-${endDay}`;
        } else {
          // Per eventi con orario, usa formato diretto senza conversioni timezone
          eventData.dtstart = start.replace('T', ' '); // "2025-06-24T15:00" -> "2025-06-24 15:00"
          eventData.dtend = end.replace('T', ' ');     // "2025-06-24T16:00" -> "2025-06-24 16:00"
        }

        await this._updateCalendarEvent(editingEventId, eventData);

        this._showSuccessMessage(this._t('eventModifiedOnGoogleCalendar'), 'orange');

        // Gestisci le notifiche se abilitate
        await this._handleEventNotifications(form, title, eventData.dtstart, 'update');

        // Aggiornamento immediato della lista eventi (senza aspettare)
        this._immediateEventUpdate(form, date, popup, 'update');

        // Sincronizzazione completa in background
        setTimeout(() => this._forceSyncAndRefresh(popup, date), 100);
      } else {
        // Crea nuovo evento su Google Calendar
        const newEventData = {
          summary: title,
          description: description
        };

        if (isAllDay) {
          // Per eventi tutto il giorno, usa le date dai campi input
          const startDateValue = form.querySelector('.event-start-date').value; // "2025-07-12"
          const endDateValue = form.querySelector('.event-end-date').value;     // "2025-07-14"

          // Evento tutto il giorno: usa le date selezionate dall'utente
          newEventData.dtstart = startDateValue;

          // Per eventi tutto il giorno in Google Calendar, dtend deve essere il giorno successivo all'ultimo giorno
          const endDate = new Date(endDateValue);
          endDate.setDate(endDate.getDate() + 1); // Aggiungi un giorno
          const endYear = endDate.getFullYear();
          const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(endDate.getDate()).padStart(2, '0');

          newEventData.dtend = `${endYear}-${endMonth}-${endDay}`;
        } else {
          // Per eventi con orario, usa formato diretto senza conversioni timezone
          newEventData.dtstart = start.replace('T', ' '); // "2025-06-24T15:00" -> "2025-06-24 15:00"
          newEventData.dtend = end.replace('T', ' ');     // "2025-06-24T16:00" -> "2025-06-24 16:00"
        }

        await this._createCalendarEvent(newEventData);

        this._showSuccessMessage(this._t('eventCreatedOnGoogleCalendar'), 'blue');

        // Gestisci le notifiche se abilitate
        await this._handleEventNotifications(form, title, newEventData.dtstart, 'create');

        // Aggiornamento immediato della lista eventi (senza aspettare)
        this._immediateEventUpdate(form, date, popup, 'create');

        // Sincronizzazione completa in background
        setTimeout(() => this._forceSyncAndRefresh(popup, date), 100);
      }

      // Resetta il form dopo creazione/modifica (mantenendo la data del giorno selezionato)
      this._resetEventForm(form, date);

    } catch (error) {
      console.error('Errore durante la gestione dell\'evento:', error);
      alert(`${this._t('eventHandlingError')}: ${error.message}`);
    } finally {
      // Libera il flag per permettere nuove creazioni
      this._isCreatingEvent = false;
    }
  }

  async _handleSaveEdit(form, eventId, date, popup) {


    // Evita elaborazioni multiple simultanee
    if (this._isSavingEdit) return;
    this._isSavingEdit = true;

    if (!this._primaryCalendar) {
      alert('Nessun calendario principale configurato');
      this._isSavingEdit = false;
      return;
    }

    const title = form.querySelector('.event-title').value;
    const description = form.querySelector('.event-description').value;
    let start = form.querySelector('.event-start').value;
    let end = form.querySelector('.event-end').value;
    const isAllDay = form.querySelector('.all-day-checkbox').checked;

    // Se è "tutto il giorno", prendi i valori dai campi date
    if (isAllDay) {
      const startDate = form.querySelector('.event-start-date').value;
      const endDate = form.querySelector('.event-end-date').value;
      
      if (!startDate || !endDate) {
        alert(this._t('fillAllDayDates'));
        this._isSavingEdit = false;
        return;
      }
      
      // Per eventi tutto il giorno, usa le date selezionate
      start = startDate + 'T00:00';
      end = endDate + 'T23:59';
    }

    if (!title || !start || !end) {
      alert(this._t('fillRequiredFields'));
      this._isSavingEdit = false;
      return;
    }

    // Auto-correzione silenziosa per eventi NON tutto il giorno
    if (!isAllDay) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Se la fine è prima o uguale all'inizio nello stesso giorno, correggi automaticamente
      if (startDate.toDateString() === endDate.toDateString() && endDate <= startDate) {
        const newEndDate = new Date(startDate);
        newEndDate.setHours(startDate.getHours() + 1);
        newEndDate.setMinutes(startDate.getMinutes());
        end = newEndDate.toISOString();
      }
    }

    try {
      // Modifica evento esistente su Google Calendar
      const eventData = {
        summary: title,
        description: description
      };

      if (isAllDay) {
        // Per eventi tutto il giorno, usa le date dai campi input
        const startDateValue = form.querySelector('.event-start-date').value; // "2025-07-12"
        const endDateValue = form.querySelector('.event-end-date').value;     // "2025-07-14"

        // Evento tutto il giorno: usa le date selezionate dall'utente
        eventData.dtstart = startDateValue;

        // Per eventi tutto il giorno in Google Calendar, dtend deve essere il giorno successivo all'ultimo giorno
        const endDate = new Date(endDateValue);
        endDate.setDate(endDate.getDate() + 1); // Aggiungi un giorno
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(endDate.getDate()).padStart(2, '0');

        eventData.dtend = `${endYear}-${endMonth}-${endDay}`;
      } else {
        // Per eventi con orario, usa formato diretto senza conversioni timezone
        eventData.dtstart = start.replace('T', ' '); // "2025-06-24T15:00" -> "2025-06-24 15:00"
        eventData.dtend = end.replace('T', ' ');     // "2025-06-24T16:00" -> "2025-06-24 16:00"
      }

      await this._updateCalendarEvent(eventId, eventData);

      this._showSuccessMessage(this._t('eventModifiedSuccessfully'), 'orange');

      // Aggiornamento immediato della lista eventi (senza aspettare)
      this._immediateEventUpdate(form, date, popup, 'update');

      // Sincronizzazione completa in background
      setTimeout(() => this._forceSyncAndRefresh(popup, date), 100);

      // Resetta il form dopo modifica (ritorna in modalità creazione)
      this._resetEventForm(form, date);

    } catch (error) {
      console.error('Errore durante la modifica dell\'evento:', error);
      alert(`${this._t('eventModificationError')}: ${error.message}`);
    } finally {
      this._isSavingEdit = false;
    }
  }

  async _createCalendarEvent(eventData) {
    if (!this._hass || !this._primaryCalendar) {
      throw new Error('Home Assistant o calendario principale non disponibile');
    }

    try {
      await this._hass.callWS({
        type: 'calendar/event/create',
        entity_id: this._primaryCalendar,
        event: eventData
      });
    } catch (error) {
      console.error('Errore nella creazione evento:', error);
      throw new Error(`Impossibile creare l'evento: ${error.message}`);
    }
  }

  async _updateCalendarEvent(eventId, eventData) {
    if (!this._hass || !this._primaryCalendar) {
      throw new Error('Home Assistant o calendario principale non disponibile');
    }

    try {
      // Prima eliminiamo l'evento esistente
      await this._hass.callWS({
        type: 'calendar/event/delete',
        entity_id: this._primaryCalendar,
        uid: eventId
      });

      // Poi creiamo il nuovo evento con i dati aggiornati
      await this._hass.callWS({
        type: 'calendar/event/create',
        entity_id: this._primaryCalendar,
        event: eventData
      });


    } catch (error) {
      console.error('Errore nella modifica evento:', error);
      throw new Error(`Impossibile modificare l'evento: ${error.message}`);
    }
  }

  async _deleteCalendarEvent(eventId) {
    if (!this._hass || !this._primaryCalendar) {
      throw new Error('Home Assistant o calendario principale non disponibile');
    }

    try {
      // Estrai l'UID corretto dall'eventId
      // Se l'eventId è nel formato "calendar.entity_id_uid", estrai solo la parte UID
      let actualUid = eventId;

      // Controlla se l'eventId inizia con "calendar." (formato completo)
      if (eventId.includes('calendar.') && eventId.includes('_')) {
        // Trova l'ultimo underscore per separare l'UID
        const lastUnderscoreIndex = eventId.lastIndexOf('_');
        if (lastUnderscoreIndex !== -1) {
          actualUid = eventId.substring(lastUnderscoreIndex + 1);

        }
      }

      // Se l'UID contiene ancora parti del calendar entity, prova un approccio diverso
      if (actualUid.includes('calendar.')) {
        // Prova a estrarre solo la parte numerica finale
        const matches = eventId.match(/(\d+)$/);
        if (matches) {
          actualUid = matches[1];

        }
      }



      await this._hass.callWS({
        type: 'calendar/event/delete',
        entity_id: this._primaryCalendar,
        uid: actualUid
      });



    } catch (error) {
      console.error('Errore nell\'eliminazione evento:', error);

      // Se il primo tentativo fallisce, prova con l'ID originale completo
      if (!eventId.includes('calendar.')) {
      throw new Error(`Impossibile eliminare l'evento: ${error.message}`);
      }



      try {
        // Usa il servizio Better Calendar come fallback
        await this._hass.callService('better_calendar', 'delete_event', {
          event_id: eventId
        });



      } catch (fallbackError) {
        console.error('Errore anche con Better Calendar service:', fallbackError);
        throw new Error(`Impossibile eliminare l'evento: ${error.message}. Fallback error: ${fallbackError.message}`);
      }
    }
  }

  _immediateEventUpdate(form, date, popup, action = 'create') {
    // Aggiorna immediatamente la lista eventi nel popup senza aspettare sync
    const title = form.querySelector('.event-title').value;
    const description = form.querySelector('.event-description').value;
    const isAllDay = form.querySelector('.all-day-checkbox').checked;
    const editingEventId = form.dataset.editingEventId;

    // Se è una modifica, trova e aggiorna l'evento esistente
    if (action === 'update' && editingEventId) {
      const existingEventIndex = this._events.findIndex(e => e.id === editingEventId);
      if (existingEventIndex !== -1) {
        this._events[existingEventIndex].summary = title;
        this._events[existingEventIndex].description = description;
        this._events[existingEventIndex].isAllDay = isAllDay;
      }
    } else if (action === 'create') {
      // Aggiungi temporaneamente il nuovo evento alla lista per visualizzazione immediata
      const tempEvent = {
        id: `temp_${Date.now()}`,
        summary: title,
        description: description,
        start: date.toISOString(),
        end: date.toISOString(),
        isAllDay: isAllDay,
        backgroundColor: this._calendars.find(c => c.entity_id === this._primaryCalendar)?.backgroundColor || '#3182ce',
        calendar: this._primaryCalendar || '',
        isLocal: false,
        isEditable: true
      };

      // Aggiungi solo se non esiste già un evento con lo stesso titolo oggi
      const existingEvent = this._events.find(e =>
        e.summary === title &&
        new Date(e.start).toDateString() === date.toDateString()
      );

      if (!existingEvent) {
        this._events.push(tempEvent);
      }
    }

    // Aggiorna immediatamente la lista visuale nel popup
    this._updateEventListInPopup(popup, date);
  }

  async _handleEventNotifications(form, eventTitle, eventStart, action = 'create') {
    try {
      // Controlla se le notifiche sono abilitate e configurate
      const pushCheckbox = form.querySelector('.push-notification-checkbox');
      const alexaCheckbox = form.querySelector('.alexa-notification-checkbox');

      if (!pushCheckbox && !alexaCheckbox) {

        return;
      }

      // Gestisci notifiche push
      if (pushCheckbox && pushCheckbox.checked) {
        const timingValue = form.querySelector('.push-notification-timing').value;
        const device = form.querySelector('.push-notification-device')?.value || 'auto';

        let timing;
        if (timingValue === 'custom') {
          // Usa nuovo sistema di timing personalizzato (tempo + giorni prima)
          const pushNotificationTiming = form.querySelector('.push-notification-timing').closest('.notification-timing');
          const customTimeElement = pushNotificationTiming.querySelector('.custom-notification-time');
          const customDaysElement = pushNotificationTiming.querySelector('.custom-days-before');

          if (!customTimeElement || !customDaysElement) {
            console.error('❌ Elementi timing personalizzato non trovati per Push');
            this._showSuccessMessage(this._t('invalidTimingConfiguration'), 'red');
            return;
          }

          // Gestisci il valore dei giorni (incluso il caso "custom")
          let daysValue = customDaysElement.value;
          if (daysValue === 'custom') {
            const customDaysInput = pushNotificationTiming.querySelector('.custom-days-value');
            if (!customDaysInput || !customDaysInput.value) {
              this._showSuccessMessage('❌ Inserisci il numero di giorni personalizzato', 'red');
              return;
            }
            daysValue = customDaysInput.value;
          }

          timing = this._calculateNotificationOffset(eventStart, customTimeElement.value, daysValue);

          // Validazione del risultato
          if (isNaN(timing) || timing < 0) {
            this._showSuccessMessage('❌ Errore: configurazione timing non valida', 'red');
            return;
          }
        } else {
          timing = parseInt(timingValue);
        }

        await this._addNotificationToBetterCalendar(
          eventTitle,
          eventStart,
          'push',
          timing,
          device === 'auto' ? null : device
        );


      }

      // Gestisci notifiche Alexa
      if (alexaCheckbox && alexaCheckbox.checked) {
        const timingValue = form.querySelector('.alexa-notification-timing').value;
        const device = form.querySelector('.alexa-notification-device')?.value || 'auto';

        let timing;
        if (timingValue === 'custom') {
          // Usa nuovo sistema di timing personalizzato (tempo + giorni prima)
          const alexaNotificationTiming = form.querySelector('.alexa-notification-timing').closest('.notification-timing');
          const customTimeElement = alexaNotificationTiming.querySelector('.custom-notification-time');
          const customDaysElement = alexaNotificationTiming.querySelector('.custom-days-before');

          if (!customTimeElement || !customDaysElement) {
            console.error('❌ Elementi timing personalizzato non trovati per Alexa');
            this._showSuccessMessage('❌ Errore: configurazione timing personalizzato non valida', 'red');
            return;
          }

          // Gestisci il valore dei giorni (incluso il caso "custom")
          let daysValue = customDaysElement.value;
          if (daysValue === 'custom') {
            const customDaysInput = alexaNotificationTiming.querySelector('.custom-days-value');
            if (!customDaysInput || !customDaysInput.value) {
              this._showSuccessMessage('❌ Inserisci il numero di giorni personalizzato', 'red');
              return;
            }
            daysValue = customDaysInput.value;
          }

          timing = this._calculateNotificationOffset(eventStart, customTimeElement.value, daysValue);

          // Validazione del risultato
          if (isNaN(timing) || timing < 0) {
            this._showSuccessMessage('❌ Errore: configurazione timing non valida', 'red');
            return;
          }
        } else {
          timing = parseInt(timingValue);
        }

        console.log('🔊 Aggiungendo notifica Alexa:', {
          eventTitle,
          eventStart,
          timing,
          device: device === 'auto' ? null : device
        });

        await this._addNotificationToBetterCalendar(
          eventTitle,
          eventStart,
          'alexa',
          timing,
          device === 'auto' ? null : device
        );


      }

    } catch (error) {
      console.error('❌ Errore nella gestione delle notifiche:', error);
      this._showSuccessMessage(this._t('eventCreatedButNotificationError'), 'orange');
    }
  }

  /**
   * Calcola l'offset in minuti per la notifica basandosi su:
   * - eventStart: data/ora di inizio dell'evento 
   * - notificationTime: orario della notifica (es. "09:30")
   * - daysBefore: giorni prima dell'evento (numero come stringa)
   */
  _calculateNotificationOffset(eventStart, notificationTime, daysBefore) {
    try {
      // Parse della data di inizio evento
      let eventDate;
      if (eventStart.includes(' ')) {
        // Formato: "2025-01-24 15:30"
        eventDate = new Date(eventStart.replace(' ', 'T'));
      } else if (eventStart.includes('T')) {
        // Formato: "2025-01-24T15:30"
        eventDate = new Date(eventStart);
      } else {
        // Formato solo data: "2025-01-24" (evento tutto il giorno)
        eventDate = new Date(eventStart + 'T09:00'); // Assume le 9:00 per eventi tutto il giorno
      }

      // Parse dell'orario di notifica (es. "09:30")
      const [hours, minutes] = notificationTime.split(':').map(Number);
      
      // Parse dei giorni prima - ora dovrebbe sempre essere un numero
      const daysOffset = parseInt(daysBefore) || 0;

      // Calcola la data/ora della notifica
      const notificationDate = new Date(eventDate);
      notificationDate.setDate(notificationDate.getDate() - daysOffset);
      notificationDate.setHours(hours, minutes, 0, 0);

      // Calcola la differenza in millisecondi
      const timeDiff = eventDate.getTime() - notificationDate.getTime();
      
      // Converte in minuti
      const offsetMinutes = Math.floor(timeDiff / (1000 * 60));

      console.log('📅 Calcolo offset notifica:', {
        eventStart,
        eventDate: eventDate.toISOString(),
        notificationTime,
        daysBefore,
        daysOffset,
        notificationDate: notificationDate.toISOString(),
        offsetMinutes
      });

      return offsetMinutes;
    } catch (error) {
      console.error('❌ Errore nel calcolo offset notifica:', error);
      return -1; // Ritorna valore di errore
    }
  }

  async _addNotificationToBetterCalendar(eventTitle, eventStart, notificationType, offsetMinutes, targetDevice = null, eventId = null, customMessagePush = null, customMessageAlexa = null) {
    try {


      // Prepara i parametri del servizio
      const serviceParams = {
        event_id: eventId || `${eventTitle}_${eventStart}`,
        event_summary: eventTitle,
        event_start: eventStart,
        notification_type: notificationType,
        offset_minutes: offsetMinutes,
        target_device: targetDevice
      };

      // Aggiungi messaggi personalizzati se forniti
      if (customMessagePush && customMessagePush.trim()) {
        serviceParams.custom_message_push = customMessagePush.trim();
      }
      if (customMessageAlexa && customMessageAlexa.trim()) {
        serviceParams.custom_message_alexa = customMessageAlexa.trim();
      }

      // Chiama il servizio Better Calendar per aggiungere la notifica
      const response = await this._hass.callService('better_calendar', 'add_notification', serviceParams);


      // Prima sincronizza i file JSON dal custom component
      await this._syncNotificationFiles();

      // Aspetta un momento per permettere al custom component di aggiornare i file
      await new Promise(resolve => setTimeout(resolve, 200));

      // Forza il refresh completo degli eventi dal backend
      await this._refreshBetterCalendar();

      // Ricarica completamente tutti gli eventi per assicurarsi che le notifiche siano visibili
      await this._fetchEvents();



    } catch (error) {
      console.error('❌ Errore durante aggiunta notifica:', error);
      throw error;
    }
  }

  async _syncNotificationFiles() {
    // Sincronizzazione rapida senza chiamate di servizio lente


    // Forza solo un refresh del sensore
    try {
      await this._hass.callService('homeassistant', 'update_entity', {
        entity_id: Object.keys(this._hass.states).find(id =>
          id.includes('better_calendar') && id.includes('notifications'))
      });
    } catch (error) {

    }
  }



  async _handleEventNotificationsPopup(eventId, popup, date) {


    // Cerca l'evento con criteri più ampi, come in _getEventNotifications
    let event = this._events.find(e => e.id === eventId || e.uid === eventId);

    // Se non trovato e l'ID sembra temporaneo, prova a ricaricare gli eventi
    if (!event && eventId.startsWith('temp_')) {

      await this._loadBetterCalendarData();
      event = this._events.find(e => e.id === eventId || e.uid === eventId);
    }

    // Se non trovato e l'ID sembra di Google Calendar, prova criteri alternativi
    if (!event && eventId.includes('@google.com')) {


      // Prova a cercare negli eventi che hanno un google_calendar_id
      event = this._events.find(e =>
        e.google_calendar_id === eventId ||
        e.uid === eventId ||
        e.original_id === eventId
      );

      if (!event) {
        // Se ancora non trovato, ricarica i dati
        await this._loadBetterCalendarData();
        event = this._events.find(e =>
          e.google_calendar_id === eventId ||
          e.uid === eventId ||
          e.original_id === eventId ||
          e.id === eventId
        );
      }
    }

    // Se ancora non trovato, prova a cercare per summary nell'ultima ora (caso di eventi appena creati)
    if (!event) {

      const recentEvents = this._events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date);
        const now = new Date();
        const diffHours = Math.abs(now - eventDate) / (1000 * 60 * 60);
        return diffHours < 168; // Eventi nelle ultime 168 ore (7 giorni)
      });

      // Se è stato passato un popup precedente, prova a estrarre il summary dal DOM
      if (popup && popup.querySelector) {
        const summaryElement = popup.querySelector('.event-summary');
        if (summaryElement) {
          const summary = summaryElement.textContent.trim();
          event = recentEvents.find(e => e.summary === summary);
          if (event) {

          }
        }
      }
    }

    if (!event) {
      console.error('❌ Evento non trovato:', eventId);


      // Cerca se esiste un evento con summary simile
      const similarEvents = this._events.filter(e =>
        e.summary && e.summary.toLowerCase().includes('prova')
      );

      if (similarEvents.length > 0) {


        // Prova a usare il primo evento simile
        event = similarEvents[0];

      } else {
        this._showSuccessMessage('❌ Evento non trovato', 'pink');
        return;
      }
    }



    try {
      // Ottieni notifiche esistenti per questo evento
      const notifications = await this._getEventNotifications(eventId);


      const notificationsPopup = document.createElement('div');
          notificationsPopup.className = `notifications-popup-overlay ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}`;
      notificationsPopup.innerHTML = `
        <div class="notifications-popup">
          <div class="notifications-header">
            <span>${this._t('notificationsFor')}: ${event.summary}</span>
            <button class="notifications-close-button">×</button>
          </div>

          <div class="notifications-content">
            <div class="notifications-list">
              ${notifications.length > 0 ? `
                <div class="existing-notifications">
                  <h4>${this._t('activeNotifications')}:</h4>
                  ${notifications.map(notif => `
                    <div class="notification-item">
                      <div class="notification-info">
                        <span class="notification-type">${notif.notification_type === 'push' ? '<ha-icon icon="mdi:cellphone"></ha-icon>' : '<ha-icon icon="mdi:microphone"></ha-icon>'} ${notif.notification_type.toUpperCase()}</span>
                        <span class="notification-timing">${this._formatNotificationTiming(notif.offset_minutes)}</span>
                        ${notif.target_device && notif.target_device !== 'auto' ? `<span class="notification-device">${notif.target_device}</span>` : ''}
                        ${notif.enabled === false ? `<span class="notification-status">${this._t('disabled')}</span>` : ''}

                      </div>
                      <button class="notification-remove" data-notification-id="${notif.id}">×</button>
                    </div>
                  `).join('')}
                </div>
              ` : `<div class="no-notifications">${this._t('noNotificationsConfigured')}</div>`}
            </div>

            <div class="add-notification-section">
              <h4>${this._t('addNewNotification')}:</h4>
              <div class="notification-form">
                <div class="form-row">
                  <label>${this._t('type')}:</label>
                  <select class="notification-type-select">
                    <option value="push"><ha-icon icon="mdi:cellphone"></ha-icon> Push</option>
                    <option value="alexa"><ha-icon icon="mdi:microphone"></ha-icon> Alexa</option>
                  </select>
                </div>

                <div class="form-row">
                  <label>${this._t('when')}:</label>
                  <div class="timing-controls-container">
                    <select class="notification-timing-select">
                      <option value="5">5 ${this._t('minutesBefore')}</option>
                      <option value="15" selected>15 ${this._t('minutesBefore')}</option>
                      <option value="30">30 ${this._t('minutesBefore')}</option>
                      <option value="60">1 ${this._t('hourBefore')}</option>
                      <option value="120">2 ${this._t('hoursBefore')}</option>
                      <option value="360">6 ${this._t('hoursBefore')}</option>
                      <option value="720">12 ${this._t('hoursBefore')}</option>
                      <option value="1440">1 ${this._t('dayBefore')}</option>
                      <option value="2880">2 ${this._t('daysBefore')}</option>
                      <option value="4320">3 ${this._t('daysBefore')}</option>
                      <option value="10080">1 ${this._t('weekBefore')}</option>
                      <option value="20160">2 ${this._t('weeksBefore')}</option>
                      <option value="custom">⏰ ${this._t('custom')}...</option>
                    </select>
                    <div class="custom-timing-input" style="display: none; margin-top: 8px;">
                      <div class="custom-timing-container">
                        <div class="custom-timing-field">
                          <label class="custom-timing-label">${this._t('notificationTime')}:</label>
                          <input type="time" class="custom-notification-time custom-timing-time-input" value="09:00">
                        </div>
                        <div class="custom-timing-field">
                          <label class="custom-timing-label">${this._t('when')}:</label>
                          <select class="custom-days-before custom-timing-days-select">
                            <option value="0">${this._t('sameDay')}</option>
                            <option value="1">${this._t('oneDayBefore')}</option>
                            <option value="2">${this._t('twoDaysBefore')}</option>
                            <option value="3">${this._t('threeDaysBefore')}</option>
                            <option value="custom">${this._t('customDaysBefore')}</option>
                          </select>
                          <input type="number" class="custom-days-value custom-timing-days-input" min="0" max="365" placeholder="Giorni">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <label>${this._t('device')}:</label>
                  <select class="notification-device-select">
                  </select>
                </div>

                <div class="custom-message-section">
                  <div class="form-row custom-message-push" style="display: block;">
                    <label>📱 ${this._t('pushMessage')}:</label>
                    <textarea class="custom-message-push-input"
                              style="width: 100%; min-height: 60px; padding: 8px; border-radius: 6px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; resize: vertical; font-size: 13px; margin-top: 4px;">${this._t('defaultPushMessage')}</textarea>
                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">
                      💡 ${this._t('variables')}: {event_summary}, {offset_desc}, {event_time}, {event_date}
                    </div>
                  </div>

                  <div class="form-row custom-message-alexa" style="display: none;">
                    <label>🔊 ${this._t('alexaMessage')}:</label>
                    <textarea class="custom-message-alexa-input"
                              style="width: 100%; min-height: 60px; padding: 8px; border-radius: 6px; border: 1px solid rgba(0, 212, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; resize: vertical; font-size: 13px; margin-top: 4px;">${this._t('defaultAlexaMessage')}</textarea>
                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">
                      💡 ${this._t('variables')}: {event_summary}, {offset_desc}, {event_time}, {event_date}
                    </div>
                  </div>
                </div>

                <button class="add-notification-btn">➕ ${this._t('addNotification')}</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Aggiungi stili per il popup notifiche
      if (!document.querySelector('#notifications-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'notifications-popup-styles';
        style.textContent = this._getNotificationsPopupStyles();
        document.head.appendChild(style);
      }

      document.body.appendChild(notificationsPopup);

      // Aggiungi event listeners
      await this._attachNotificationsPopupListeners(notificationsPopup, eventId, event);

    } catch (error) {

      this._showSuccessMessage('❌ Errore nel caricamento notifiche', 'pink');
    }
  }

  async _getEventNotifications(eventId) {
    try {
      // Prima controlla nell'evento locale
      let event = this._events.find(e => e.id === eventId || e.uid === eventId);
      if (event && event.notifications && event.notifications.length > 0) {
        return event.notifications;
      }

      // Se non ci sono notifiche locali, prova dal sensore direttamente (senza ricaricamenti)
      const entities = Object.keys(this._hass.states);
      const notificationsSensorId = entities.find(id =>
        id.includes('better_calendar') && id.includes('notifications')
      );

      if (notificationsSensorId) {
        const sensor = this._hass.states[notificationsSensorId];

        if (sensor && sensor.attributes && sensor.attributes.notifications_data) {
          const notificationsData = sensor.attributes.notifications_data;

          // Cerca notifiche per questo evento con criteri più ampi
          const eventNotifications = [];
          for (const [notifId, notification] of Object.entries(notificationsData)) {
            let isMatchingEvent = false;

            // Prova matching per ID diretto
            if (notification.event_id === eventId) {
              isMatchingEvent = true;
            }

            // Prova matching per summary e data se abbiamo l'evento
            if (!isMatchingEvent && event && notification.event_summary === event.summary) {
              // Verifica anche la data se disponibile
              if (notification.event_start && event.start) {
                const notifDate = notification.event_start.split('T')[0];
                const eventDate = (event.start?.dateTime || event.start?.date || '').split('T')[0];

                if (notifDate === eventDate) {
                  isMatchingEvent = true;
                }
              } else {
                isMatchingEvent = true;
              }
            }

            // Prova matching per eventi temporanei (cerca per summary e data simile)
            if (!isMatchingEvent && eventId.startsWith('temp_')) {
              const matchingEvent = this._events.find(e =>
                e.summary === notification.event_summary &&
                e.start && notification.event_start &&
                (e.start.dateTime?.includes(notification.event_start.split('T')[0]) ||
                 e.start.date?.includes(notification.event_start.split('T')[0]))
              );

              if (matchingEvent) {
                isMatchingEvent = true;
                event = matchingEvent; // Aggiorna il riferimento all'evento
              }
            }

            // Prova matching per Google Calendar ID con criteri più ampi
            if (!isMatchingEvent && eventId.includes('@google.com')) {
              // Cerca per tutti i possibili ID dell'evento
              const currentEvent = this._events.find(e =>
                e.id === eventId ||
                e.uid === eventId ||
                e.google_calendar_id === eventId ||
                e.original_id === eventId
              );

              if (currentEvent && currentEvent.summary === notification.event_summary) {
                isMatchingEvent = true;
                event = currentEvent;
              }
            }

            if (isMatchingEvent) {
              eventNotifications.push({
                id: notification.id,
                notification_type: notification.notification_type,
                offset_minutes: notification.offset_minutes,
                target_device: notification.target_device,
                enabled: notification.enabled !== false
              });
            }
          }

          // Aggiorna anche l'evento locale per la prossima volta
          if (event) {
            event.notifications = eventNotifications;
          }

          return eventNotifications;
        }
      }

      return [];

    } catch (error) {
      console.error('❌ Errore caricamento notifiche:', error);
      return [];
    }
  }

  async _getNotificationsSensor() {
    try {
      if (!this._hass) return null;

      // Cerca il sensore delle notifiche
      const entities = Object.keys(this._hass.states);
      const notificationsSensorId = entities.find(id =>
        id.includes('better_calendar') && id.includes('notifications')
      );

      if (notificationsSensorId) {
        return this._hass.states[notificationsSensorId];
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  _formatNotificationTiming(minutes) {
    if (minutes >= 10080) {
      const weeks = Math.floor(minutes / 10080);
      return `${weeks} ${this._t(weeks > 1 ? 'weeksBefore' : 'weekBefore')}`;
    } else if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} ${this._t(days > 1 ? 'daysBefore' : 'dayBefore')}`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${this._t(hours > 1 ? 'hoursBefore' : 'hourBefore')}`;
    } else {
      return `${minutes} ${this._t('minutesBefore')}`;
    }
  }

  _getNotificationsPopupStyles() {
    return `
      .notifications-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
      }

      .notifications-popup {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        border-radius: 15px;
        padding: 20px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(0, 212, 255, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .notifications-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        color: white;
        font-weight: 600;
      }

      .notifications-close-button {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 20px;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .notifications-close-button:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .notification-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin: 8px 0;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(0, 212, 255, 0.2);
      }

      .notification-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .notification-type {
        font-weight: 600;
        color: rgba(0, 212, 255, 0.9);
      }

      .notification-timing {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      .notification-device {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .notification-status {
        font-size: 11px;
        color: #ff6b6b;
        font-weight: bold;
        margin-left: 10px;
      }

      .notification-remove {
        background: rgba(236, 72, 153, 0.2);
        border: 1px solid rgba(236, 72, 153, 0.4);
        color: #ec4899;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .notification-remove:hover {
        background: rgba(236, 72, 153, 0.4);
        transform: scale(1.1);
      }

      .add-notification-section {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(0, 212, 255, 0.2);
      }

      .add-notification-section h4 {
        color: white;
        margin-bottom: 15px;
      }

      .form-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 0;
      }

      .form-row label {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        min-width: 80px;
      }

      .form-row select {
        flex: 1;
        margin-left: 10px;
        padding: 6px;
        border-radius: 6px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
      }

      .timing-controls-container {
        flex: 1;
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .timing-controls-container .notification-timing-select {
        width: 100%;
        padding: 6px;
        border-radius: 6px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        margin: 0;
      }

      .add-notification-btn {
        width: 100%;
        padding: 10px;
        margin-top: 15px;
        background: linear-gradient(135deg, #00d4ff, #9333ea);
        border: 1px solid #00d4ff;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .add-notification-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
      }

      .no-notifications {
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
        padding: 20px;
      }

      .existing-notifications h4 {
        color: white;
        margin-bottom: 10px;
      }

      .custom-message-section {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(0, 212, 255, 0.2);
      }

      .custom-message-push-input,
      .custom-message-alexa-input {
        resize: vertical;
        font-family: inherit;
        line-height: 1.3;
      }

      .custom-message-push-input::placeholder,
      .custom-message-alexa-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
      }

      .custom-timing-value {
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        border-radius: 6px;
        padding: 6px;
      }

      /* Custom Timing Classes per popup notifiche */
      .custom-timing-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        border: 1px solid rgba(0, 212, 255, 0.2);
      }

      .custom-timing-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .custom-timing-label {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 500;
      }

      .custom-timing-time-input {
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        width: 100%;
      }

      .custom-timing-days-select {
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
      }

      .custom-timing-days-input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        display: none;
        margin-top: 4px;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        border: 1px solid rgba(0, 212, 255, 0.3);
        background: rgba(0, 0, 0, 0.3);
        color: white;
        border-radius: 6px;
        padding: 6px;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        border-color: #00d4ff;
        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
      }

      /* TEMA LIGHT */
      .notifications-popup-overlay.light-theme .notifications-popup {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .notifications-header {
        color: #1a202c;
        border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      }

      .notifications-popup-overlay.light-theme .notifications-close-button {
        color: rgba(30, 41, 59, 0.7);
      }

      .notifications-popup-overlay.light-theme .notifications-close-button:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .notification-item {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.2);
      }

      .notifications-popup-overlay.light-theme .notification-type {
        color: rgba(59, 130, 246, 0.9);
      }

      .notifications-popup-overlay.light-theme .notification-timing {
        color: rgba(30, 41, 59, 0.7);
      }

      .notifications-popup-overlay.light-theme .notification-device {
        color: rgba(30, 41, 59, 0.5);
      }

      .notifications-popup-overlay.light-theme .notification-remove {
        background: rgba(219, 39, 119, 0.2);
        border: 1px solid rgba(219, 39, 119, 0.4);
        color: #db2777;
      }

      .notifications-popup-overlay.light-theme .notification-remove:hover {
        background: rgba(219, 39, 119, 0.4);
      }

      .notifications-popup-overlay.light-theme .add-notification-section,
      .notifications-popup-overlay.light-theme .custom-message-section {
        border-top: 1px solid rgba(59, 130, 246, 0.2);
      }

      .notifications-popup-overlay.light-theme .add-notification-section h4,
      .notifications-popup-overlay.light-theme .existing-notifications h4 {
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .form-row label {
        color: rgba(30, 41, 59, 0.8);
      }

      .notifications-popup-overlay.light-theme .form-row select {
        border: 1px solid rgba(59, 130, 246, 0.3);
        background: rgba(255, 255, 255, 0.9);
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .add-notification-btn {
        background: linear-gradient(135deg, #3b82f6, #7c3aed);
        border: 1px solid #3b82f6;
      }

      .notifications-popup-overlay.light-theme .add-notification-btn:hover {
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
      }

      .notifications-popup-overlay.light-theme .no-notifications {
        color: rgba(30, 41, 59, 0.6);
      }

      .notifications-popup-overlay.light-theme .custom-message-push-input::placeholder,
      .notifications-popup-overlay.light-theme .custom-message-alexa-input::placeholder {
        color: rgba(30, 41, 59, 0.4);
      }

      .notifications-popup-overlay.light-theme .custom-timing-value {
        border: 1px solid rgba(59, 130, 246, 0.3);
        background: rgba(255, 255, 255, 0.9);
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .form-group input,
      .notifications-popup-overlay.light-theme .form-group select,
      .notifications-popup-overlay.light-theme .form-group textarea {
        border: 1px solid rgba(59, 130, 246, 0.3);
        background: rgba(255, 255, 255, 0.9);
        color: #1a202c;
      }

      .notifications-popup-overlay.light-theme .form-group input:focus,
      .notifications-popup-overlay.light-theme .form-group select:focus,
      .notifications-popup-overlay.light-theme .form-group textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }

      /* TEMA GOOGLE DARK */
      .notifications-popup-overlay.google-dark-theme .notifications-popup {
        background: #202124;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #e8eaed;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-header {
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-close-button {
        color: rgba(255, 255, 255, 0.7);
      }

      .notifications-popup-overlay.google-dark-theme .notifications-close-button:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .notifications-popup-overlay.google-dark-theme .notification-item {
        background: rgba(66, 133, 244, 0.1);
        border: 1px solid rgba(66, 133, 244, 0.2);
      }

      .notifications-popup-overlay.google-dark-theme .notification-type {
        color: #8ab4f8;
      }

      .notifications-popup-overlay.google-dark-theme .notification-timing {
        color: rgba(255, 255, 255, 0.7);
      }

      .notifications-popup-overlay.google-dark-theme .notification-device {
        color: rgba(255, 255, 255, 0.5);
      }

      .notifications-popup-overlay.google-dark-theme .notification-remove {
        background: rgba(244, 67, 54, 0.2);
        border: 1px solid rgba(244, 67, 54, 0.4);
        color: #f44336;
      }

      .notifications-popup-overlay.google-dark-theme .notification-remove:hover {
        background: rgba(244, 67, 54, 0.4);
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-section,
      .notifications-popup-overlay.google-dark-theme .custom-message-section {
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-section h4,
      .notifications-popup-overlay.google-dark-theme .existing-notifications h4 {
        color: #ffffff;
      }

      .notifications-popup-overlay.google-dark-theme .form-row label {
        color: rgba(255, 255, 255, 0.8);
      }

      .notifications-popup-overlay.google-dark-theme .form-row select {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: #ffffff;
        color: black;
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-btn {
        background: #4285f4;
        border: 1px solid #4285f4;
      }

      .notifications-popup-overlay.google-dark-theme .add-notification-btn:hover {
        background: #5294f5;
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4);
      }

      .notifications-popup-overlay.google-dark-theme .no-notifications {
        color: rgba(255, 255, 255, 0.6);
      }

      .notifications-popup-overlay.google-dark-theme .custom-timing-value {
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }



      .notifications-popup-overlay.google-dark-theme .custom-message-push-input::placeholder,
      .notifications-popup-overlay.google-dark-theme .custom-message-alexa-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      /* TEMA GOOGLE LIGHT */
      .notifications-popup-overlay.google-light-theme .notifications-popup {
        background: #ffffff;
        border: 1px solid rgba(60, 64, 67, 0.12);
        color: #202124;
        box-shadow: 0 8px 32px rgba(60, 64, 67, 0.15);
      }

      .notifications-popup-overlay.google-light-theme .notifications-header {
        color: #202124;
        border-bottom: 1px solid rgba(60, 64, 67, 0.12);
      }

      .notifications-popup-overlay.google-light-theme .notifications-close-button {
        color: rgba(60, 64, 67, 0.7);
      }

      .notifications-popup-overlay.google-light-theme .notifications-close-button:hover {
        background: rgba(60, 64, 67, 0.08);
        color: #202124;
      }

      .notifications-popup-overlay.google-light-theme .notification-item {
        background: rgba(66, 133, 244, 0.08);
        border: 1px solid rgba(66, 133, 244, 0.12);
      }

      .notifications-popup-overlay.google-light-theme .notification-type {
        color: #4285f4;
      }

      .notifications-popup-overlay.google-light-theme .notification-timing {
        color: rgba(32, 33, 36, 0.7);
      }

      .notifications-popup-overlay.google-light-theme .notification-device {
        color: rgba(32, 33, 36, 0.5);
      }

      .notifications-popup-overlay.google-light-theme .notification-remove {
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: #d93025;
      }

      .notifications-popup-overlay.google-light-theme .notification-remove:hover {
        background: rgba(244, 67, 54, 0.2);
      }

      .notifications-popup-overlay.google-light-theme .add-notification-section,
      .notifications-popup-overlay.google-light-theme .custom-message-section {
        border-top: 1px solid rgba(60, 64, 67, 0.12);
      }

      .notifications-popup-overlay.google-light-theme .add-notification-section h4,
      .notifications-popup-overlay.google-light-theme .existing-notifications h4 {
        color: #202124;
      }

      .notifications-popup-overlay.google-light-theme .form-row label {
        color: rgba(32, 33, 36, 0.8);
      }

      .notifications-popup-overlay.google-light-theme .form-row select {
        border: 1px solid rgba(60, 64, 67, 0.12);
        background: rgba(255, 255, 255, 0.9);
        color: #202124;
      }

      .notifications-popup-overlay.google-light-theme .add-notification-btn {
        background: #4285f4;
        border: 1px solid #4285f4;
      }

      .notifications-popup-overlay.google-light-theme .add-notification-btn:hover {
        background: #5294f5;
        box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4);
      }

      .notifications-popup-overlay.google-light-theme .no-notifications {
        color: rgba(32, 33, 36, 0.6);
      }

      .notifications-popup-overlay.google-light-theme .custom-message-push-input::placeholder,
      .notifications-popup-overlay.google-light-theme .custom-message-alexa-input::placeholder {
        color: rgba(32, 33, 36, 0.4);
      }

      .notifications-popup-overlay.google-light-theme .custom-timing-value {
        border: 1px solid rgba(60, 64, 67, 0.12);
        background: rgba(255, 255, 255, 0.9);
        color: #202124;
      }


    `;
  }

  async _attachNotificationsPopupListeners(popup, eventId, event) {
    // Assicurati che i dispositivi siano caricati
    await this._loadAvailableDevices();

    // Popola la dropdown dei dispositivi con i dispositivi disponibili
    this._populateDeviceDropdown(popup);

    // Close button
    const closeBtn = popup.querySelector('.notifications-close-button');
    closeBtn.addEventListener('click', () => popup.remove());

    // Click outside to close
    let mouseDownTarget = null;
    
    popup.addEventListener('mousedown', (e) => {
      mouseDownTarget = e.target;
    });
    
    popup.addEventListener('click', (e) => {
      // Chiudi solo se il mousedown e click sono sullo stesso target (popup) e non c'è selezione di testo
      if (e.target === popup && mouseDownTarget === popup && !window.getSelection().toString()) {
        popup.remove();
      }
    });

    // Remove notification buttons
    const removeButtons = popup.querySelectorAll('.notification-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const notificationId = btn.dataset.notificationId;
        await this._removeNotification(notificationId, eventId);
        popup.remove();
        // Riapri il popup per mostrare le notifiche aggiornate
        setTimeout(() => this._handleEventNotificationsPopup(eventId, popup, null), 300);
      });
    });

    // Custom timing logic nel popup notifiche
    const popupTimingSelect = popup.querySelector('.notification-timing-select');
    if (popupTimingSelect) {
      popupTimingSelect.addEventListener('change', () => {
        const customDiv = popup.querySelector('.custom-timing-input');
        if (customDiv) {
          customDiv.style.display = popupTimingSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Logica per i giorni prima personalizzati (Popup notifiche)
    const popupDaysSelect = popup.querySelector('.custom-days-before');
    if (popupDaysSelect) {
      popupDaysSelect.addEventListener('change', () => {
        const customDaysInput = popup.querySelector('.custom-days-value');
        if (customDaysInput) {
          customDaysInput.style.display = popupDaysSelect.value === 'custom' ? 'inline-block' : 'none';
        }
      });
    }

    // Gestione campi messaggi personalizzati
    const typeSelect = popup.querySelector('.notification-type-select');
    if (typeSelect) {
      const updateMessageFields = () => {
        const pushField = popup.querySelector('.custom-message-push');
        const alexaField = popup.querySelector('.custom-message-alexa');
        const pushTextarea = popup.querySelector('.custom-message-push-input');
        const alexaTextarea = popup.querySelector('.custom-message-alexa-input');

        if (pushField && alexaField) {
          if (typeSelect.value === 'push') {
            pushField.style.display = 'block';
            alexaField.style.display = 'none';
            // Precompila il messaggio di default se vuoto
            if (pushTextarea && !pushTextarea.value.trim()) {
              pushTextarea.value = 'Promemoria: {event_summary} inizia {offset_desc} (alle {event_time})';
            }
          } else if (typeSelect.value === 'alexa') {
            pushField.style.display = 'none';
            alexaField.style.display = 'block';
            // Precompila il messaggio di default se vuoto
            if (alexaTextarea && !alexaTextarea.value.trim()) {
              alexaTextarea.value = 'Attenzione! L\'evento {event_summary} inizia {offset_desc}, alle ore {event_time}';
            }
          }
        }
      };

      // Inizializza la visualizzazione
      updateMessageFields();

      // Aggiorna quando cambia il tipo
      typeSelect.addEventListener('change', updateMessageFields);
    }

    // Add notification button
    const addBtn = popup.querySelector('.add-notification-btn');
    if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const type = popup.querySelector('.notification-type-select').value;
      const timingValue = popup.querySelector('.notification-timing-select').value;
      const device = popup.querySelector('.notification-device-select').value;

      // Leggi i messaggi personalizzati
      const pushMessageInput = popup.querySelector('.custom-message-push-input');
      const alexaMessageInput = popup.querySelector('.custom-message-alexa-input');
      const customMessagePush = pushMessageInput ? pushMessageInput.value.trim() : null;
      const customMessageAlexa = alexaMessageInput ? alexaMessageInput.value.trim() : null;

      let timing;
      if (timingValue === 'custom') {
        // Usa nuovo sistema di timing personalizzato (tempo + giorni prima)
        const customTimeElement = popup.querySelector('.custom-notification-time');
        const customDaysElement = popup.querySelector('.custom-days-before');

        if (!customTimeElement || !customDaysElement) {
          this._showSuccessMessage('❌ Errore: elementi timing personalizzato non trovati', 'red');
          return;
        }

        // Gestisci il valore dei giorni (incluso il caso "custom")
        let daysValue = customDaysElement.value;
        if (daysValue === 'custom') {
          const customDaysInput = popup.querySelector('.custom-days-value');
          if (!customDaysInput || !customDaysInput.value) {
            this._showSuccessMessage('❌ Inserisci il numero di giorni personalizzato', 'red');
            return;
          }
          daysValue = customDaysInput.value;
        }

        timing = this._calculateNotificationOffset(event.start, customTimeElement.value, daysValue);

        // Validazione del risultato
        if (isNaN(timing) || timing < 0) {
          this._showSuccessMessage('❌ Errore: configurazione timing non valida', 'red');
          return;
        }
      } else {
        timing = parseInt(timingValue);
      }

        try {
          await this._addNotificationToBetterCalendar(
            event.summary,
            event.start,
            type,
            timing,
            device === 'auto' ? null : device,
            eventId,
            customMessagePush || null,
            customMessageAlexa || null
          );

          this._showSuccessMessage('🔔 Notifica aggiunta!', 'blue');
          popup.remove();

          // Aspetta un momento per permettere alla sincronizzazione di completarsi
          setTimeout(() => this._handleEventNotificationsPopup(eventId, popup, null), 300);

        } catch (error) {

          this._showSuccessMessage('❌ Errore aggiungendo notifica', 'pink');
        }
    });
    }
  }

  _populateDeviceDropdown(popup) {
    const typeSelect = popup.querySelector('.notification-type-select');
    const deviceSelect = popup.querySelector('.notification-device-select');

    if (!typeSelect || !deviceSelect) {

      return;
    }

    if (!this._availableDevices) {

      return;
    }

    const updateDeviceOptions = () => {
      const selectedType = typeSelect.value;
      deviceSelect.innerHTML = '';

      if (selectedType === 'push') {
        const devices = this._availableDevices?.mobile || [];

        devices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.service;
          option.textContent = device.name;
          deviceSelect.appendChild(option);
        });
      } else if (selectedType === 'alexa') {
        const devices = this._availableDevices?.alexa || [];

        devices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.service;
          option.textContent = device.name;
          deviceSelect.appendChild(option);
        });
      }
    };

    // Inizializza le opzioni
    updateDeviceOptions();

    // Aggiorna quando cambia il tipo di notifica
    typeSelect.addEventListener('change', updateDeviceOptions);
  }

  async _removeNotification(notificationId, eventId = null) {
    try {
      await this._hass.callService('better_calendar', 'remove_notification', {
        notification_id: notificationId
      });

      // Sincronizza i file JSON dal custom component
      await this._syncNotificationFiles();

      // Aspetta un momento per permettere al custom component di aggiornare i file
      await new Promise(resolve => setTimeout(resolve, 300));

      // Forza il refresh completo degli eventi dal backend
      await this._refreshBetterCalendar();

      // Ricarica completamente tutti gli eventi per assicurarsi che le notifiche siano aggiornate
      await this._fetchEvents();


      this._showSuccessMessage('🗑️ Notifica rimossa!', 'orange');

    } catch (error) {
      console.error('❌ Errore durante rimozione notifica:', error);
      this._showSuccessMessage('❌ Errore nella rimozione', 'pink');
    }
  }

  async _loadAvailableDevices() {
    if (!this._hass) {
      return;
    }

    try {
      // Carica servizi notify divisi per categoria
      const pushDevices = [];
      const alexaDevices = [];

      // 1. Cerca servizi notify
      const services = this._hass.services.notify || {};

      for (const serviceName in services) {
        // Salta servizi interni e generici inutili
        if (serviceName === 'persistent_notification' || 
            serviceName === 'send_message' ||
            serviceName === 'notify') {
          continue;
        }

        const cleanName = serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const deviceInfo = {
          service: `notify.${serviceName}`,
          name: cleanName,
          id: serviceName
        };

        // Determina se è un dispositivo Alexa o Push
        const isAlexaDevice = serviceName.includes('alexa_media') || 
                             serviceName.includes('_speak') || 
                             serviceName.includes('_announce') ||
                             serviceName.includes('speak') || 
                             serviceName.includes('announce');

        if (isAlexaDevice) {
          // Solo per Alexa/TTS
          alexaDevices.push(deviceInfo);
        } else {
          // Per notifiche push (mobile, telegram, ecc.)
          pushDevices.push(deviceInfo);
        }
      }

      // 1.5 Cerca entità notify (per servizi speak/announce)
      const states = this._hass.states;
      Object.keys(states).forEach(entityId => {
        if (entityId.startsWith('notify.')) {
          const entity = states[entityId];
          const serviceName = entityId.replace('notify.', '');
          
          // Salta se già aggiunto dai servizi
          if (services[serviceName]) {
            return;
          }

          const cleanName = serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

          const deviceInfo = {
            service: entityId,
            name: cleanName,
            id: serviceName
          };

          // Determina se è un dispositivo Alexa o Push
          const isAlexaDevice = serviceName.includes('alexa_media') || 
                               serviceName.includes('_speak') || 
                               serviceName.includes('_announce') ||
                               serviceName.includes('speak') || 
                               serviceName.includes('announce');

          if (isAlexaDevice) {
            // Solo per Alexa/TTS
            alexaDevices.push(deviceInfo);
          } else {
            // Per notifiche push (mobile, telegram, ecc.)
            pushDevices.push(deviceInfo);
          }
        }
      });

      // 2. Cerca anche entità media_player per Alexa
      Object.keys(states).forEach(entityId => {
        if (entityId.startsWith('media_player.') &&
            (entityId.includes('echo') || entityId.includes('alexa'))) {
          const entity = states[entityId];
          const friendlyName = entity.attributes.friendly_name || entityId.split('.')[1];

          // Evita duplicati
          if (!alexaDevices.find(d => d.name === friendlyName)) {
            alexaDevices.push({
              service: entityId,
              name: friendlyName,
              id: entityId.split('.')[1]
            });
          }
        }
      });

      // Aggiorna i dispositivi disponibili
      this._availableDevices = {
        mobile: pushDevices,  // Notifiche push (mobile, telegram, ecc.)
        alexa: alexaDevices   // Notifiche vocali (servizi Alexa specifici)
      };

      console.log('🔍 Dispositivi rilevati:', {
        mobile: pushDevices.length,
        alexa: alexaDevices.length,
        alexaDevices: alexaDevices.map(d => d.name),
        allNotifyServices: Object.keys(services),
        allNotifyEntities: Object.keys(states).filter(e => e.startsWith('notify.'))
      });

          } catch (error) {
        // Fallback dispositivi vuoti
      this._availableDevices = {
        mobile: [],
        alexa: []
      };
    }
  }

  _showSuccessMessage(message, color = 'blue') {
    const colors = {
      blue: 'rgba(0, 212, 255, 0.9)',
      orange: 'rgba(255, 165, 0, 0.9)',
      pink: 'rgba(236, 72, 153, 0.9)'
    };

    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, ${colors[color]}, rgba(147, 51, 234, 0.9));
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      z-index: 1001;
      font-family: 'Orbitron', 'Roboto', sans-serif;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      border: 1px solid ${colors[color]};
      animation: flashIn 0.3s ease;
    `;
    successMsg.textContent = message;
    document.body.appendChild(successMsg);

    setTimeout(() => {
      successMsg.style.transition = 'all 0.2s ease';
      successMsg.style.transform = 'translateY(-20px)';
      successMsg.style.opacity = '0';
      setTimeout(() => successMsg.remove(), 200);
    }, 2000);
  }

  async _forceSyncAndRefresh(popup = null, date = null) {
    try {
      // 1. Forza Home Assistant a fare refresh di tutti i calendari
      if (this._hass && this._calendars && this._calendars.length > 0) {
        for (const calendar of this._calendars) {
          await this._hass.callService('homeassistant', 'update_entity', {
            entity_id: calendar.entity_id
          });
        }
      }

      // 2. Aspetta un momento per la sincronizzazione con Google Calendar
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Ricarica tutti gli eventi dal server
      this._isFirstLoad = true; // Forza il refresh dopo sync
      await this._fetchEvents();

      // 4. Se abbiamo il popup, aggiorna anche la lista eventi
      if (popup && date) {
        this._updateEventListInPopup(popup, date);
      }



    } catch (error) {
      console.warn('Errore durante la sincronizzazione forzata:', error);
      // Anche se c'è un errore, proviamo almeno a ricaricare gli eventi
      this._isFirstLoad = true; // Forza il refresh anche in caso di errore
      await this._fetchEvents();

      if (popup && date) {
        this._updateEventListInPopup(popup, date);
      }
    }
  }

  _handleEditEvent(eventId, popup, date) {
    const event = this._events.find(e => e.id === eventId);
    if (!event || !event.isEditable) return;

    // Popola il form con i dati dell'evento esistente
    const form = popup.querySelector('.event-form');
    const titleInput = form.querySelector('.event-title');
    const descriptionInput = form.querySelector('.event-description');
    const startInput = form.querySelector('.event-start');
    const endInput = form.querySelector('.event-end');
    const startDateInput = form.querySelector('.event-start-date');
    const endDateInput = form.querySelector('.event-end-date');
    const allDayCheckbox = form.querySelector('.all-day-checkbox');
    const submitButton = form.querySelector('button[type="submit"]');
    const dateLabels = popup.querySelectorAll('.datetime-label');

    // Riempi i campi
    titleInput.value = event.summary || '';
    descriptionInput.value = event.description || '';

    if (event.isAllDay) {
      allDayCheckbox.checked = true;
      
      // Mostra i campi date e nascondi quelli datetime
      startInput.style.display = 'none';
      endInput.style.display = 'none';
      startDateInput.style.display = 'block';
      endDateInput.style.display = 'block';
      
      // Cambia le label
      dateLabels[0].textContent = this._t('dateStart');
      dateLabels[1].textContent = this._t('dateEnd');

      // Popola i campi date con le date dell'evento
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      startDateInput.value = startDate.toISOString().split('T')[0];
      endDateInput.value = endDate.toISOString().split('T')[0];

      // Per i campi nascosti, imposta valori predefiniti
      const defaultTimes = this._getDefaultEventTimes(startDate);
      startInput.value = defaultTimes.start;
      endInput.value = defaultTimes.end;
    } else {
      allDayCheckbox.checked = false;
      
      // Mostra i campi datetime e nascondi quelli date
      startInput.style.display = 'block';
      endInput.style.display = 'block';
      startDateInput.style.display = 'none';
      endDateInput.style.display = 'none';
      
      // Ripristina le label originali
      dateLabels[0].textContent = this._t('datetimeStart');
      dateLabels[1].textContent = this._t('datetimeEnd');

      // Usa una funzione per preservare l'orario locale senza conversioni UTC
      startInput.value = this._dateToLocalISOString(new Date(event.start));
      endInput.value = this._dateToLocalISOString(new Date(event.end));
    }

    // Cambia il pulsante e aggiungi l'ID dell'evento al form
    submitButton.textContent = `💾 ${this._t('saveEditEvent')}`;
    submitButton.className = 'btn btn-warning';
    submitButton.style.background = 'linear-gradient(135deg, #ff8c00, #ff6b35)';
    submitButton.style.border = '1px solid #ff8c00';
    submitButton.style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.5)';
    form.dataset.editingEventId = eventId;

    // Applica anche qui la logica di auto-correzione orari per il form di editing
    if (!event.isAllDay && startInput && endInput) {
      const startTime = new Date(startInput.value);
      const endTime = new Date(endInput.value);

      // Se l'orario di fine è prima o uguale all'inizio, correggi automaticamente
      if (endTime <= startTime) {
        const correctedEndTime = new Date(startTime);
        correctedEndTime.setHours(correctedEndTime.getHours() + 1);
        endInput.value = this._dateToLocalISOString(correctedEndTime);
      }
    }

    // Scorri in alto per mostrare il form
    popup.querySelector('.popup-side').scrollTop = 0;
  }

  _resetEventForm(form, selectedDate) {
    // Resetta tutti i campi del form
    form.querySelector('.event-title').value = '';
    form.querySelector('.event-description').value = '';
    form.querySelector('.all-day-checkbox').checked = false;

    // Riferimenti ai campi
    const startInput = form.querySelector('.event-start');
    const endInput = form.querySelector('.event-end');
    const startDateInput = form.querySelector('.event-start-date');
    const endDateInput = form.querySelector('.event-end-date');
    const dateLabels = form.parentElement.querySelectorAll('.datetime-label');

    // Mostra i campi datetime e nascondi quelli date
    startInput.style.display = 'block';
    endInput.style.display = 'block';
    startDateInput.style.display = 'none';
    endDateInput.style.display = 'none';

    // Ripristina le label originali
    if (dateLabels.length >= 2) {
      dateLabels[0].textContent = this._t('datetimeStart');
      dateLabels[1].textContent = this._t('datetimeEnd');
    }

    // Ripristina sempre gli stessi orari predefiniti (9:00-10:00)
    const defaultTimes = this._getDefaultEventTimes(selectedDate);
    startInput.value = defaultTimes.start;
    endInput.value = defaultTimes.end;

    // Resetta anche i campi date
    const dateStr = selectedDate.toISOString().split('T')[0];
    startDateInput.value = dateStr;
    endDateInput.value = dateStr;

    // Ripristina il pulsante
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = `➕ ${this._t('addEvent')}`;
    submitButton.className = 'btn btn-primary';
    submitButton.style.background = 'linear-gradient(135deg, #00d4ff, #9333ea)';
    submitButton.style.border = '1px solid #00d4ff';
    submitButton.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.5)';

    // Rimuovi l'ID di editing
    delete form.dataset.editingEventId;
  }

  _updateEventListInPopup(popup, date) {
    const eventsList = popup.querySelector('.events-list');
    const mobileEventsList = popup.querySelector('.mobile-events-list');

    // Ottieni eventi aggiornati per il giorno
    const events = this._getEventsForDay(date);

    const eventsHTML = events.length > 0 ? events.map((event, index) => `
      <div class="event-item" data-event-id="${event.id}" style="opacity: 1; transform: translateY(0); transition: all 0.2s ease;">
        <div class="event-item-title">
          ${event.summary}
        </div>
        <div class="event-item-time">
          ${event.isAllDay ?
            `<span style="color: rgba(0, 212, 255, 0.9); font-weight: 600;"><ha-icon icon="mdi:calendar-today"></ha-icon> ${this._t('allDay')}</span>` :
            `${this._formatTime(event.start)} - ${this._formatTime(event.end)}`
          }
        </div>
        ${event.description ? `
          <div class="event-item-description">${event.description}</div>
        ` : ''}
        <div class="event-item-actions">
          ${event.isEditable ? `<button class="event-item-edit" data-event-id="${event.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
          ${event.isEditable ? `<button class="event-item-notifications" data-event-id="${event.id}" title="Gestisci notifiche" style="color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.9)' : 'rgba(255, 255, 255, 0.6)'}; background: ${event.notifications && event.notifications.length > 0 ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(147, 51, 234, 0.2))' : 'linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(147, 51, 234, 0.2))'}; border-color: ${event.notifications && event.notifications.length > 0 ? 'rgba(255, 165, 0, 0.4)' : 'rgba(100, 100, 100, 0.4)'};"><ha-icon icon="mdi:bell"></ha-icon></button>` : ''}
          ${event.isEditable ? `<button class="event-item-delete" data-event-id="${event.id}">×</button>` : ''}
        </div>
      </div>
    `).join('') : `<div class="no-events">${this._t('noEventsThisDay')}</div>`;

    // Aggiorna la lista desktop (seconda finestra)
    if (eventsList) {
      eventsList.innerHTML = eventsHTML;
    }

    // Aggiorna la lista mobile (nella prima finestra)
    if (mobileEventsList) {
      const mobileEventsContent = `
        <div class="mobile-events-title">Eventi del Giorno</div>
        ${eventsHTML}
      `;
      mobileEventsList.innerHTML = mobileEventsContent;
    }

    // Riassegna gli event listeners immediatamente
    this._attachEventListeners(popup, date);
  }



  _cleanupPopup() {


    // Resetta tutti i flag
    this._isCreatingEvent = false;
    this._isSavingEdit = false;
    this._isUpdating = false;

    // Rimuovi event listener
    if (this._eventListClickHandler) {
      const eventsList = document.querySelector('.events-list');
      if (eventsList) {
        eventsList.removeEventListener('click', this._eventListClickHandler);
      }
    }

    // Rimuovi tutti i popup esistenti per evitare sovrapposizioni
    const existingPopups = document.querySelectorAll('.popup-overlay');
    existingPopups.forEach(popup => {
      if (popup && popup.parentNode) {
      popup.remove();
      }
    });

    // Permetti refresh dopo chiusura popup
    this._isFirstLoad = true;
  }

  _attachEventListeners(popup, date) {
    // Event delegation per i pulsanti degli eventi (desktop e mobile)
    const eventsList = popup.querySelector('.events-list');
    const mobileEventsList = popup.querySelector('.mobile-events-list');

    // Handler comune per entrambe le liste
    const createEventHandler = (listElement) => {
      if (!listElement) return;

    // Rimuovi listener esistenti se presenti
      if (listElement._eventListClickHandler) {
        listElement.removeEventListener('click', listElement._eventListClickHandler);
    }

    // Crea nuovo handler e salvalo nell'elemento
      listElement._eventListClickHandler = async (e) => {
      const editButton = e.target.closest('.event-item-edit');
      const deleteButton = e.target.closest('.event-item-delete');
      const notificationsButton = e.target.closest('.event-item-notifications');

      if (editButton) {
        e.preventDefault();
        e.stopPropagation();
        const eventId = editButton.dataset.eventId;

        this._handleEditEvent(eventId, popup, date);
      } else if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        const eventId = deleteButton.dataset.eventId;

        this._handleDeleteEvent(eventId, popup, date);
      } else if (notificationsButton) {
        e.preventDefault();
        e.stopPropagation();
        const eventId = notificationsButton.dataset.eventId;



          try {
            await this._handleEventNotificationsPopup(eventId, popup, date);
          } catch (error) {
            console.error('❌ Errore aprendo popup notifiche:', error);
            this._showSuccessMessage('❌ Errore aprendo popup notifiche', 'pink');
          }
      }
    };

    // Attacca il nuovo listener
      listElement.addEventListener('click', listElement._eventListClickHandler);
    };

    // Applica handler a entrambe le liste
    createEventHandler(eventsList);
    createEventHandler(mobileEventsList);
  }

  async _handleDeleteEvent(eventId, popup, selectedDate = null) {
    const event = this._events.find(e => e.id === eventId);
    if (!event || !event.isEditable) return;

    try {
      const eventElement = popup.querySelector(`[data-event-id="${eventId}"]`);
      if (eventElement) {
        eventElement.style.transition = 'all 0.1s ease';
        eventElement.style.transform = 'scale(0) rotate(90deg)';
        eventElement.style.opacity = '0';

        setTimeout(() => {
          eventElement.remove();

          // Controlla se non ci sono più eventi da mostrare
          const eventsList = popup.querySelector('.events-list');
          const remainingEvents = eventsList.querySelectorAll('.event-item');
          if (remainingEvents.length === 0) {
            eventsList.innerHTML = `<div class="no-events">${this._t('noEventsThisDay')}</div>`;
          }
        }, 100);
      }

      // Elimina evento da Google Calendar
      await this._deleteCalendarEvent(eventId);

      this._showSuccessMessage('⚡ Evento Eliminato!', 'pink');

      // Rimuovi anche dall'array locale per evitare che ricompaia
      this._events = this._events.filter(e => e.id !== eventId);

      // Sincronizzazione completa in background (senza aspettare)
      const eventDate = selectedDate || new Date(event.start);
      setTimeout(() => this._forceSyncAndRefresh(popup, eventDate), 50);

    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'evento:', error);
      alert(`Errore durante l'eliminazione dell'evento: ${error.message}`);

      // Se c'è stato un errore, prova a ricaricare gli eventi
      try {
        await this._fetchEvents();
        const eventDate = selectedDate || new Date(event.start);
        this._updateEventListInPopup(popup, eventDate);
      } catch (refreshError) {
        console.error('Errore anche durante il refresh:', refreshError);
      }
    }
  }

  _calculateEaster(year) {
    // Algoritmo di Meeus/Jones/Butcher per calcolare la Pasqua
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  _isHoliday(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const year = date.getFullYear();

    // Festività fisse
    const fixedHolidays = [
      { day: 1, month: 1 },    // Capodanno
      { day: 6, month: 1 },    // Epifania
      { day: 25, month: 4 },   // Festa della Liberazione
      { day: 1, month: 5 },    // Festa del Lavoro
      { day: 2, month: 6 },    // Festa della Repubblica
      { day: 15, month: 8 },   // Ferragosto
      { day: 1, month: 11 },   // Ognissanti
      { day: 8, month: 12 },   // Immacolata Concezione
      { day: 25, month: 12 },  // Natale
      { day: 26, month: 12 }   // Santo Stefano
    ];

    // Controlla festività fisse
    if (fixedHolidays.some(holiday => holiday.day === day && holiday.month === month)) {
      return true;
    }

    // Calcola Pasqua e Pasquetta
    const easter = this._calculateEaster(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    // Controlla Pasqua e Pasquetta
    if ((date.getTime() === easter.getTime()) ||
        (date.getTime() === easterMonday.getTime())) {
      return true;
    }

    return false;
  }

  _isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domenica, 6 = sabato
  }

  _getAdvancedConfigContent() {
    return `
      <div class="config-popup">
        <div class="config-header">
          <span>⚙️ Pannello Configurazioni</span>
          <button class="config-close-button">×</button>
        </div>

        <div class="config-content">
          <div class="config-section">
            <div class="config-label">📅 Selezione Calendari</div>
            <select class="config-select" id="calendar-type-select" multiple>
              <option value="" disabled>Seleziona i calendari da utilizzare...</option>
              ${this._availableCalendars.map(cal => `
                <option value="${cal.entity_id}"
                          ${this._selectedCalendars.includes(cal.entity_id) ? 'selected' : ''}>
                  ${cal.type} - ${cal.name}
                </option>
              `).join('')}
            </select>
            <div class="config-help">Seleziona uno o più calendari. Il primo sarà il principale per creare eventi.</div>
          </div>

          <div class="config-section">

          </div>

          <div class="config-section">
            <div class="config-label">🌓 Tema</div>
            <select class="config-select" id="theme-select">
              <option value="dark" ${this._theme === 'dark' ? 'selected' : ''}>🌙 Scuro</option>
              <option value="light" ${this._theme === 'light' ? 'selected' : ''}>☀️ Chiaro</option>
            </select>
            <div class="config-help">Scegli il tema del calendario.</div>
          </div>

          <div class="config-section">
            <div class="config-label">📱 Notifiche Mobile</div>
            <div class="config-toggle">
              <label class="toggle-switch">
                <input type="checkbox" id="mobile-notifications-toggle"
                       ${this._notificationSettings.mobile_enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-label">Attiva notifiche mobile</span>
              </label>
            </div>
            <select class="config-select" id="mobile-devices-select" multiple
                    ${!this._notificationSettings.mobile_enabled ? 'disabled' : ''}>
              <option value="" disabled>Seleziona dispositivi mobile...</option>
              ${this._availableDevices.mobile ? this._availableDevices.mobile.map(device => `
                <option value="${device.entity_id}"
                        ${this._notificationSettings.mobile_devices.includes(device.entity_id) ? 'selected' : ''}>
                  📱 ${device.name}
                </option>
              `).join('') : '<option disabled>Nessun dispositivo mobile trovato</option>'}
            </select>
            <div class="config-help">Seleziona i dispositivi mobile per le notifiche eventi.</div>
          </div>

          <div class="config-section">
            <div class="config-label">🔊 Notifiche Alexa</div>
            <div class="config-toggle">
              <label class="toggle-switch">
                <input type="checkbox" id="alexa-notifications-toggle"
                       ${this._notificationSettings.alexa_enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-label">Attiva notifiche Alexa</span>
              </label>
            </div>
            <select class="config-select" id="alexa-devices-select" multiple
                    ${!this._notificationSettings.alexa_enabled ? 'disabled' : ''}>
              <option value="" disabled>Seleziona dispositivi Alexa...</option>
              ${this._availableDevices.alexa ? this._availableDevices.alexa.map(device => `
                <option value="${device.entity_id}"
                        ${this._notificationSettings.alexa_devices.includes(device.entity_id) ? 'selected' : ''}>
                  🔊 ${device.name}
                </option>
              `).join('') : '<option disabled>Nessun dispositivo Alexa trovato</option>'}
            </select>
            <div class="config-help">Seleziona i dispositivi Alexa per gli annunci vocali.</div>
          </div>
        </div>

        <div class="config-actions">
          <button class="config-save-button">✅ Salva Configurazione</button>
          <button class="config-cancel-button">❌ Annulla</button>
        </div>
      </div>
    `;
  }

  _getAdvancedConfigStyles() {
    return `
      .config-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Orbitron', 'Roboto', sans-serif;
      }

      .config-popup-overlay.light-theme {
        background: rgba(255, 255, 255, 0.85);
      }

      .config-popup {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        border: 2px solid rgba(0, 212, 255, 0.5);
        border-radius: 20px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 60px rgba(0, 212, 255, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
        color: #ffffff;
        animation: configPopupIn 0.3s ease;
      }

      .config-popup-overlay.light-theme .config-popup {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
        border: 2px solid rgba(59, 130, 246, 0.5);
        color: #1a202c;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.1),
          0 0 60px rgba(59, 130, 246, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      @keyframes configPopupIn {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-30px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 32px;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        background: linear-gradient(90deg, rgba(0, 212, 255, 0.1), rgba(147, 51, 234, 0.1));
      }

      .config-popup-overlay.light-theme .config-header {
        border-bottom: 1px solid rgba(59, 130, 246, 0.3);
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(124, 58, 237, 0.1));
      }

      .config-header span {
        font-size: 22px;
        font-weight: 700;
        background: linear-gradient(45deg, #00d4ff, #9333ea, #ec4899);
        background-size: 300% 300%;
        animation: neonText 3s ease infinite;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .config-popup-overlay.light-theme .config-header span {
        background: linear-gradient(45deg, #3b82f6, #7c3aed, #db2777);
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
      }

      .config-close-button {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(147, 51, 234, 0.3));
        border: 1px solid rgba(236, 72, 153, 0.5);
        color: #ffffff;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        font-size: 20px;
        font-weight: bold;
      }

      .config-popup-overlay.light-theme .config-close-button {
        background: linear-gradient(135deg, rgba(219, 39, 119, 0.3), rgba(124, 58, 237, 0.3));
        border: 1px solid rgba(219, 39, 119, 0.5);
        color: #1a202c;
      }

      .config-close-button:hover {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(147, 51, 234, 0.6));
        transform: scale(1.1);
      }

      .config-content {
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .config-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(147, 51, 234, 0.05));
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 12px;
      }

      .config-popup-overlay.light-theme .config-section {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(124, 58, 237, 0.08));
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .config-label {
        font-size: 16px;
        font-weight: 600;
        color: rgba(0, 212, 255, 0.9);
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
      }

      .config-popup-overlay.light-theme .config-label {
        color: rgba(59, 130, 246, 0.9);
        text-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
      }

      .config-select {
        padding: 12px 16px;
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 212, 255, 0.05));
        color: #ffffff;
        font-size: 14px;
        font-family: 'Roboto', sans-serif;
        transition: all 0.3s ease;
        min-height: 45px;
      }

      .config-popup-overlay.light-theme .config-select {
        border: 1px solid rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(59, 130, 246, 0.05));
        color: #1a202c;
      }

      .config-select:focus {
        outline: none;
        border-color: rgba(0, 212, 255, 0.6);
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
      }

      .config-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .config-help {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
        margin-top: 4px;
      }

      .config-popup-overlay.light-theme .config-help {
        color: rgba(30, 41, 59, 0.7);
      }

      .config-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .toggle-switch {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .toggle-switch input[type="checkbox"] {
        display: none;
      }

      .toggle-slider {
        position: relative;
        width: 50px;
        height: 24px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.2));
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        transition: all 0.3s ease;
      }

      .toggle-slider::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(0, 212, 255, 0.1));
        border-radius: 50%;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .toggle-switch input[type="checkbox"]:checked + .toggle-slider {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(0, 212, 255, 0.8);
      }

      .toggle-switch input[type="checkbox"]:checked + .toggle-slider::before {
        transform: translateX(26px);
        background: linear-gradient(135deg, #ffffff, rgba(0, 212, 255, 0.2));
      }

      .config-actions {
        display: flex;
        gap: 16px;
        padding: 24px 32px;
        border-top: 1px solid rgba(0, 212, 255, 0.2);
        background: linear-gradient(90deg, rgba(0, 212, 255, 0.05), rgba(147, 51, 234, 0.05));
      }

      .config-popup-overlay.light-theme .config-actions {
        border-top: 1px solid rgba(59, 130, 246, 0.3);
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.05), rgba(124, 58, 237, 0.05));
      }

      .config-save-button,
      .config-cancel-button {
        flex: 1;
        padding: 12px 24px;
        border: 1px solid;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        font-family: 'Orbitron', 'Roboto', sans-serif;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .config-save-button {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(0, 212, 255, 0.6);
        color: white;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
      }

      .config-cancel-button {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(147, 51, 234, 0.8));
        border-color: rgba(236, 72, 153, 0.6);
        color: white;
        text-shadow: 0 0 5px rgba(236, 72, 153, 0.3);
      }

      .config-save-button:hover,
      .config-cancel-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
    `;
  }

  _attachAdvancedConfigEventListeners(popup) {
    // Close button
    const closeButton = popup.querySelector('.config-close-button');
    closeButton.addEventListener('click', () => {
      this._closeAdvancedConfigPopup();
    });

    // Cancel button
    const cancelButton = popup.querySelector('.config-cancel-button');
    cancelButton.addEventListener('click', () => {
      this._closeAdvancedConfigPopup();
    });

    // Save button
    const saveButton = popup.querySelector('.config-save-button');
    saveButton.addEventListener('click', () => {
      this._saveAdvancedConfig(popup);
    });

    // Toggle listeners for notifications
    const mobileToggle = popup.querySelector('#mobile-notifications-toggle');
    const alexaToggle = popup.querySelector('#alexa-notifications-toggle');
    const mobileSelect = popup.querySelector('#mobile-devices-select');
    const alexaSelect = popup.querySelector('#alexa-devices-select');

    mobileToggle.addEventListener('change', () => {
      mobileSelect.disabled = !mobileToggle.checked;
      if (!mobileToggle.checked) {
        // Deseleziona tutti i dispositivi se disabilitato
        Array.from(mobileSelect.options).forEach(option => option.selected = false);
      }
    });

    alexaToggle.addEventListener('change', () => {
      alexaSelect.disabled = !alexaToggle.checked;
      if (!alexaToggle.checked) {
        // Deseleziona tutti i dispositivi se disabilitato
        Array.from(alexaSelect.options).forEach(option => option.selected = false);
      }
    });
  }

  _closeAdvancedConfigPopup() {
    const popup = document.querySelector('.config-popup-overlay');
    if (popup) {
      popup.style.transition = 'all 0.2s ease';
      popup.style.opacity = '0';
      popup.style.transform = 'scale(0.8)';
      setTimeout(() => popup.remove(), 200);
    }
  }

  _saveAdvancedConfig(popup) {
    // Raccoglie tutti i dati dal form
    const calendarSelect = popup.querySelector('#calendar-type-select');
    const themeSelect = popup.querySelector('#theme-select');
    const mobileToggle = popup.querySelector('#mobile-notifications-toggle');
    const alexaToggle = popup.querySelector('#alexa-notifications-toggle');
    const mobileDevicesSelect = popup.querySelector('#mobile-devices-select');
    const alexaDevicesSelect = popup.querySelector('#alexa-devices-select');

    // Salva calendari selezionati
    this._selectedCalendars = Array.from(calendarSelect.selectedOptions).map(option => option.value);
    this._primaryCalendar = this._selectedCalendars.length > 0 ? this._selectedCalendars[0] : null;

    // Vista sempre mensile di default
    this._selectedView = 'monthly';

    // Salva tema
    this._theme = themeSelect.value;

    // Salva impostazioni notifiche
    this._notificationSettings = {
      mobile_enabled: mobileToggle.checked,
      alexa_enabled: alexaToggle.checked,
      mobile_devices: Array.from(mobileDevicesSelect.selectedOptions).map(option => option.value),
      alexa_devices: Array.from(alexaDevicesSelect.selectedOptions).map(option => option.value)
    };

    // Valida la configurazione
    if (this._selectedCalendars.length === 0) {
      alert('Seleziona almeno un calendario per continuare.');
      return;
    }

    // Marca come configurato
    this._isConfigured = true;
    this._showConfigPanel = false;

    // Salva nelle impostazioni
    this._saveSettings();

    // Carica i calendari configurati
    this._loadCalendars();

    // Mostra messaggio di successo
    this._showSuccessMessage('🚀 Configurazione salvata con successo!', 'blue');

    // Chiudi il popup
    this._closeAdvancedConfigPopup();

    // Avvia la sincronizzazione
    this._fetchEvents();
    this._startAutoSync();



    // Aggiorna il rendering
    this.requestUpdate();
  }

  render() {
    // Se non è configurato o deve mostrare il setup, mostra la configurazione
    if (!this._isConfigured || this._showSetup) {
      return this._renderSetup();
    }

    // Renderizza in base alla vista selezionata
    const view = this._selectedView || 'monthly';

    switch (view) {
      case 'daily':
        return this._renderDailyView();
      case 'weekly':
        return this._renderWeeklyView();
      case 'monthly':
      default:
        return this._renderMonthlyView();
    }
  }

  _renderDailyView() {
    const today = this._currentDate;
    const locale = this._language === 'it' ? 'it-IT' : 'en-US';
    const dayName = today.toLocaleDateString(locale, { weekday: 'long' });
    const dayDate = today.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const events = this._getEventsForDay(today);

    return html`
      <div class="calendar-container ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}">
        ${(this._theme === 'google-dark' || this._theme === 'google-light') ? html`
          <!-- Header Layout Google - Frecce Separate -->
          <div class="header google-header">
            <div class="google-header-row">
              <button class="nav-button prev-day google-nav" @click="${() => this._handleNavigateDay(-1)}">‹</button>
              <div class="google-title-container">
                <span class="month-title google-title">${dayName}, ${dayDate}</span>
              </div>
              <button class="nav-button next-day google-nav" @click="${() => this._handleNavigateDay(1)}">›</button>
            </div>
            <div class="google-controls-row">
              <div class="view-buttons google-view-buttons">
                <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
              </div>
              <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
            </div>
          </div>
        ` : html`
          <!-- Header Layout Originale (Dark/Light) -->
          <div class="header">
            <div class="controls-container">
              <div class="month-nav">
                <button class="nav-button prev-day" @click="${() => this._handleNavigateDay(-1)}">‹</button>
                <span class="month-title">${dayName}, ${dayDate}</span>
                <button class="nav-button next-day" @click="${() => this._handleNavigateDay(1)}">›</button>
                <div class="view-buttons">
                  <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                  <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                  <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
                </div>
                <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
              </div>
            </div>
          </div>
        `}

        <div class="daily-view">
          <div class="daily-events">
            ${events.length > 0 ? events.map(event => html`
              <div class="daily-event" style="border-left: 4px solid ${this._getEventDisplayColor(event)}" data-event-id="${event.id}">
                <div class="event-header">
                  <div class="event-time">
                    ${event.isAllDay ?
                      html`<span class="all-day-badge">${this._t('allDay')}</span>` :
                      html`<span>${new Date(event.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>`
                    }
                  </div>
                  ${event.isEditable ? html`
                    <div class="event-actions">
                      <button class="event-edit-btn" data-event-id="${event.id}" @click="${() => this._handleDayEventEdit(event.id, today)}" title="${this._t('editEvent')} evento"><ha-icon icon="mdi:pencil"></ha-icon></button>
                      <button class="event-delete-btn" data-event-id="${event.id}" @click="${() => this._handleDayEventDelete(event.id, today)}" title="${this._t('deleteEvent')} evento">×</button>
                    </div>
                  ` : ''}
                </div>
                <div class="event-title" @click="${() => this._handleDayClick(today)}">
                  ${event.summary}
                  ${event.notifications && event.notifications.length > 0 ? html`<span style="font-size: 12px; color: rgba(255, 165, 0, 0.9); margin-left: 8px;" title="Ha notifiche attive"><ha-icon icon="mdi:bell"></ha-icon></span>` : ''}

                </div>
                ${event.description ? html`<div class="event-description">${event.description}</div>` : ''}
                <div class="event-calendar"><ha-icon icon="mdi:calendar"></ha-icon> ${this._calendars.find(c => c.entity_id === event.calendar)?.name || event.calendar}</div>
              </div>
            `) : html`
              <div class="no-events-today">
                <div class="no-events-icon">📭</div>
                <div class="no-events-text">${this._t('noEventsToday')}</div>
                <button class="add-event-button" @click="${() => this._handleDayClick(today)}">➕ ${this._t('addEvent')}</button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  _renderWeeklyView() {
    const weekDays = this._getWeekDaysShort();
    const startOfWeek = this._getStartOfWeek(this._currentDate);
    const weekDates = [];

    // Genera i 7 giorni della settimana
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }

    const weekRange = `${weekDates[0].toLocaleDateString(this._getLocale(), { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString(this._getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return html`
      <div class="calendar-container ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}">
        ${(this._theme === 'google-dark' || this._theme === 'google-light') ? html`
          <!-- Header Layout Google - Frecce Separate -->
          <div class="header google-header">
            <div class="google-header-row">
              <button class="nav-button prev-week google-nav" @click="${() => this._handleNavigateWeek(-1)}">‹</button>
              <div class="google-title-container">
                <span class="month-title google-title">${weekRange}</span>
              </div>
              <button class="nav-button next-week google-nav" @click="${() => this._handleNavigateWeek(1)}">›</button>
            </div>
            <div class="google-controls-row">
              <div class="view-buttons google-view-buttons">
                <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
              </div>
              <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
            </div>
          </div>
        ` : html`
          <!-- Header Layout Originale (Dark/Light) -->
          <div class="header">
            <div class="controls-container">
              <div class="month-nav">
                <button class="nav-button prev-week" @click="${() => this._handleNavigateWeek(-1)}">‹</button>
                <span class="month-title">${weekRange}</span>
                <button class="nav-button next-week" @click="${() => this._handleNavigateWeek(1)}">›</button>
                <div class="view-buttons">
                  <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                  <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                  <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
                </div>
                <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
              </div>
            </div>
          </div>
        `}

        <div class="weekly-view">
          <div class="week-header">
            ${weekDays.map((day, index) => html`
              <div class="week-day-header ${index >= 5 ? 'weekend' : ''} ${this._isToday(weekDates[index]) ? 'today' : ''}">
                <div class="day-name">${day}</div>
                <div class="day-number">${weekDates[index].getDate()}</div>
              </div>
            `)}
          </div>

          <div class="week-body">
            ${weekDates.map((date, index) => {
              const dayEvents = this._getEventsForDay(date);
              const dayName = weekDays[index];
              return html`
                <div class="week-day ${index >= 5 ? 'weekend' : ''} ${this._isToday(date) ? 'today' : ''}"
                     @click="${() => this._handleDayClick(date)}">

                  <!-- Layout Desktop: Eventi in colonna -->
                  <div class="desktop-layout">
                  ${dayEvents.map(event => html`
                    <div class="week-event" style="background: ${this._getEventDisplayColor(event)}">
                        <div class="week-event-title">
                          ${event.summary}
                          ${event.notifications && event.notifications.length > 0 ? html`<span style="font-size: 10px; color: rgba(255, 165, 0, 0.9); margin-left: 4px;" title="Ha notifiche attive"><ha-icon icon="mdi:bell"></ha-icon></span>` : ''}

                        </div>
                      ${!event.isAllDay ? html`
                        <div class="week-event-time">${this._formatTime(event.start)}</div>
                      ` : ''}
                    </div>
                  `)}
                  ${dayEvents.length === 0 ? html`<div class="week-day-empty">+</div>` : ''}
                  </div>

                  <!-- Layout Mobile: Giorno a sinistra, eventi a destra -->
                  <div class="mobile-layout">
                    <div class="week-day-info">
                      <div class="week-day-name-mobile">${dayName}</div>
                      <div class="week-day-number-mobile">${date.getDate()}</div>
                    </div>

                    <div class="week-events-container">
                      ${dayEvents.length > 0 ? dayEvents.map(event => html`
                        <div class="week-event" style="background: ${this._getEventDisplayColor(event)}">
                          <div class="week-event-title">
                            ${event.summary}
                            ${event.notifications && event.notifications.length > 0 ? html`<span style="font-size: 12px; color: rgba(255, 165, 0, 0.9); margin-left: 6px;" title="Ha notifiche attive"><ha-icon icon="mdi:bell"></ha-icon></span>` : ''}

                          </div>
                          ${!event.isAllDay ? html`
                            <div class="week-event-time">${this._formatTime(event.start)}</div>
                          ` : ''}
                        </div>
                      `) : html`
                        <div class="week-day-empty-mobile">${this._t('noEvents')}</div>
                      `}
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  _renderMonthlyView() {
    const weekDays = this._getWeekDaysShort();
    const monthNames = this._getMonthNames();

    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const today = new Date();
    const daysInMonth = lastDay.getDate();

    // Genera array dei giorni per il rendering
    const days = [];

    // Empty cells before the first day
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: '', empty: true });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isToday = day === today.getDate() &&
                     month === today.getMonth() &&
                     year === today.getFullYear();
      const isWeekend = this._isWeekend(currentDate);
      const isHoliday = this._isHoliday(currentDate);
      const hasEvents = this._hasEventsOnDay(currentDate);
      const hasNotifications = this._hasEventsWithNotifications(currentDate);
      const hasAlexaNotifications = this._hasEventsWithAlexaNotifications(currentDate);

      days.push({
        day: day,
        empty: false,
        isToday,
        isWeekend,
        isHoliday,
        hasEvents,
        hasNotifications,
        hasAlexaNotifications
      });
    }

    // Empty cells after the last day (layout compatto: solo righe necessarie)
    const cellsUsed = days.length;
    const rowsNeeded = Math.ceil(cellsUsed / 7);
    const totalCells = rowsNeeded * 7; // Righe dinamiche × 7 giorni
    const remainingCells = totalCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ day: '', empty: true });
    }

    return html`
      <div class="calendar-container ${this._theme === 'light' ? 'light-theme' : this._theme === 'google-dark' ? 'google-dark-theme' : this._theme === 'google-light' ? 'google-light-theme' : ''}">
        ${(this._theme === 'google-dark' || this._theme === 'google-light') ? html`
          <!-- Header Layout Google - Frecce Separate -->
          <div class="header google-header">
            <div class="google-header-row">
              <button class="nav-button prev-month google-nav" @click="${() => this._handleNavigate(-1)}">‹</button>
              <div class="google-title-container">
                <span class="month-title google-title">${monthNames[month]} ${year}</span>
              </div>
              <button class="nav-button next-month google-nav" @click="${() => this._handleNavigate(1)}">›</button>
            </div>
            <div class="google-controls-row">
              <div class="view-buttons google-view-buttons">
                <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
              </div>
              <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
            </div>
          </div>
        ` : html`
          <!-- Header Layout Originale (Dark/Light) -->
          <div class="header">
            <div class="controls-container">
              <div class="month-nav">
                <button class="nav-button prev-month" @click="${() => this._handleNavigate(-1)}">‹</button>
                <span class="month-title">${monthNames[month]} ${year}</span>
                <button class="nav-button next-month" @click="${() => this._handleNavigate(1)}">›</button>
                <div class="view-buttons">
                  <button class="view-button ${this._selectedView === 'daily' ? 'active' : ''}" @click="${() => this._changeView('daily')}" title="${this._t('dailyView')}">G</button>
                  <button class="view-button ${this._selectedView === 'weekly' ? 'active' : ''}" @click="${() => this._changeView('weekly')}" title="${this._t('weeklyView')}">S</button>
                  <button class="view-button ${this._selectedView === 'monthly' ? 'active' : ''}" @click="${() => this._changeView('monthly')}" title="${this._t('monthlyView')}">M</button>
                </div>
                <button class="sync-button ${this._isFetchingEvents ? 'syncing' : ''}" @click="${() => this._handleManualSync()}" title="${this._t('syncCalendar')}"><ha-icon icon="mdi:refresh"></ha-icon></button>
              </div>
            </div>
          </div>
        `}
        <div class="weekdays">
          ${weekDays.map((day, index) => html`
            <div class="weekday${index >= 5 ? ' weekend' : ''}">${day}</div>
          `)}
        </div>
        <div class="days">
          ${days.map(dayObj => {
            if (dayObj.empty) {
              return html`<div class="day empty"></div>`;
            }

            const classes = [
              'day',
              dayObj.isToday ? 'today' : '',
              dayObj.isWeekend ? 'weekend' : '',
              dayObj.isHoliday ? 'holiday' : '',
              dayObj.hasNotifications ? 'has-notifications' : (dayObj.hasEvents ? 'has-events' : ''),
              dayObj.hasAlexaNotifications ? 'has-alexa-notifications' : ''
            ].filter(Boolean).join(' ');

            // Mostra eventi solo per i temi Google
            const currentDate = new Date(year, month, dayObj.day);
            const allDayEvents = this._getEventsForDay(currentDate);

            // Mostra eventi solo per temi Google
            const showEvents = (this._theme === 'google-dark' || this._theme === 'google-light');
            const maxEvents = 1;
            const dayEvents = showEvents ? allDayEvents.slice(0, maxEvents) : [];

            return html`
              <div class="${classes}" @click="${() => this._handleDayClick(dayObj.day)}">
                <div class="day-number">${dayObj.day}</div>
                ${dayEvents.length > 0 ? html`
                  <div class="day-events">
                    ${dayEvents.map(event => {
                      const eventPosition = this._getEventDayPosition(event, currentDate);
                      const isMultiDay = this._isMultiDayEvent(event);

                      let eventTitle = event.summary;
                      let eventClass = 'day-event';

                      if (isMultiDay) {
                        eventClass += ' multi-day-event';

                        // Aggiungi indicatori visivi per eventi multi-giorno
                        switch (eventPosition) {
                          case 'start':
                            eventTitle = `${event.summary} →`;
                            eventClass += ' event-start';
                            break;
                          case 'middle':
                            eventTitle = `→ ${event.summary} →`;
                            eventClass += ' event-middle';
                            break;
                          case 'end':
                            eventTitle = `→ ${event.summary}`;
                            eventClass += ' event-end';
                            break;
                        }
                      }

                      return html`
                        <div class="${eventClass} ${event.notifications && event.notifications.length > 0 ? 'has-notifications' : ''}" style="background-color: ${this._getEventDisplayColor(event)}" title="${isMultiDay ? 'Evento multi-giorno' : 'Evento singolo'}">
                          ${eventTitle}
                      </div>
                      `;
                    })}
                    ${allDayEvents.length > maxEvents ? html`
                      <div class="more-events">+${allDayEvents.length - maxEvents} ${allDayEvents.length - maxEvents === 1 ? 'altro' : 'altri'}</div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    return document.createElement('better-calendar-card-editor');
  }

  _hasEventsOnDay(date) {
    const events = this._getEventsForDay(date);
    return events.length > 0;
  }

  _hasEventsWithNotifications(date) {
    const events = this._getEventsForDay(date);
    const eventsWithNotifications = events.filter(event => event.notifications && event.notifications.length > 0);

    return eventsWithNotifications.length > 0;
  }

  _hasEventsWithAlexaNotifications(date) {
    const events = this._getEventsForDay(date);
    const eventsWithAlexaNotifications = events.filter(event =>
      event.notifications && event.notifications.length > 0 &&
      event.notifications.some(notif => notif.notification_type === 'alexa')
    );

    return eventsWithAlexaNotifications.length > 0;
  }

  _getEventDisplayColor(event) {
    // Se l'evento ha notifiche Alexa, mostra giallo
    if (event.notifications && event.notifications.length > 0) {
      const hasAlexaNotification = event.notifications.some(notif => notif.notification_type === 'alexa');
      if (hasAlexaNotification) {
        return '#FFD700'; // Giallo per notifiche Alexa
      }
    }
    
    // Altrimenti usa il colore normale dell'evento
    return event.backgroundColor || (this._theme === 'google-dark' ? '#8ab4f8' : '#1a73e8');
  }

  _getEventCountForDay(date) {
    const events = this._getEventsForDay(date);
    return events.length;
  }



  _isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  _isMultiDayEvent(event) {
    // Determina se un evento dura più di un giorno

    // Gestisci i diversi formati di data per l'inizio
    let eventStartDate;
    if (typeof event.start === 'string') {
      eventStartDate = new Date(event.start);
    } else if (event.start && typeof event.start === 'object') {
      if (event.start.date) {
        eventStartDate = new Date(event.start.date);
      } else if (event.start.dateTime) {
        eventStartDate = new Date(event.start.dateTime);
      } else {
        return false;
      }
    } else {
      return false;
    }

    // Gestisci i diversi formati di data per la fine
    let eventEndDate;
    if (typeof event.end === 'string') {
      eventEndDate = new Date(event.end);
    } else if (event.end && typeof event.end === 'object') {
      if (event.end.date) {
        eventEndDate = new Date(event.end.date);
      } else if (event.end.dateTime) {
        eventEndDate = new Date(event.end.dateTime);
      } else {
        return false;
      }
    } else {
      return false;
    }
    const startDate = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
    const endDate = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
    if (event.isAllDay || (event.end && event.end.date && !event.end.dateTime)) {
      if (endDate.getTime() > startDate.getTime()) {
        endDate.setDate(endDate.getDate() - 1);
      }
    }

    return endDate.getTime() > startDate.getTime();
  }

  _getEventDayPosition(event, currentDate) {
    if (!this._isMultiDayEvent(event)) {
      return 'single';
    }
    let eventStartDate;
    if (typeof event.start === 'string') {
      eventStartDate = new Date(event.start);
    } else if (event.start && typeof event.start === 'object') {
      if (event.start.date) {
        eventStartDate = new Date(event.start.date);
      } else if (event.start.dateTime) {
        eventStartDate = new Date(event.start.dateTime);
      } else {
        return 'single';
      }
    } else {
      return 'single';
    }
    let eventEndDate;
    if (typeof event.end === 'string') {
      eventEndDate = new Date(event.end);
    } else if (event.end && typeof event.end === 'object') {
      if (event.end.date) {
        eventEndDate = new Date(event.end.date);
      } else if (event.end.dateTime) {
        eventEndDate = new Date(event.end.dateTime);
      } else {
        return 'single';
      }
    } else {
      return 'single';
    }

    // Normalizza le date per il confronto
    const currentNorm = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const startNorm = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
    const endNorm = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());

    // Per eventi "tutto il giorno" che finiscono alla mezzanotte del giorno successivo
    if (event.isAllDay || (event.end && event.end.date && !event.end.dateTime)) {
      if (endNorm.getTime() > startNorm.getTime()) {
        endNorm.setDate(endNorm.getDate() - 1);
      }
    }

    if (currentNorm.getTime() === startNorm.getTime() && currentNorm.getTime() === endNorm.getTime()) {
      return 'single';
    } else if (currentNorm.getTime() === startNorm.getTime()) {
      return 'start';
    } else if (currentNorm.getTime() === endNorm.getTime()) {
      return 'end';
    } else {
      return 'middle';
    }
  }

  _dateToLocalISOString(date) {
    // Converte una data al formato ISO locale senza conversioni UTC
    // Questo preserva l'orario originale dell'evento
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  _getDefaultEventTimes(date) {
    // Restituisce sempre gli stessi orari di default: 09:00-10:00
    const startDate = new Date(date);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(10, 0, 0, 0);

    return {
      start: this._dateToLocalISOString(startDate),
      end: this._dateToLocalISOString(endDate),
      startDate: startDate,
      endDate: endDate
    };
  }

  _handleDayEventEdit(eventId, date) {

    // Apri il popup per questo giorno e attiva immediatamente l'editing
    this._showEventPopup(date);

    // Aspetta che il popup sia renderizzato, poi attiva l'editing
    setTimeout(() => {
      const popup = document.querySelector('.popup-overlay');
      if (popup) {
        this._handleEditEvent(eventId, popup, date);
      }
    }, 200);
  }

  _handleDayEventDelete(eventId, date) {

    const event = this._events.find(e => e.id === eventId);
    if (!event || !event.isEditable) return;

    // Eliminazione immediata senza conferma
    this._handleDeleteEventDirectly(eventId, date);
  }

  async _handleDeleteEventDirectly(eventId, date) {
    const event = this._events.find(e => e.id === eventId);
    if (!event || !event.isEditable) return;

    try {
      // Elimina immediatamente dalla vista
      const eventElement = document.querySelector(`[data-event-id="${eventId}"]`);
      if (eventElement) {
        eventElement.style.transition = 'all 0.3s ease';
        eventElement.style.transform = 'scale(0) rotate(180deg)';
        eventElement.style.opacity = '0';

        setTimeout(() => {
          if (eventElement.parentNode) {
            eventElement.remove();
          }
        }, 300);
      }

      // Elimina evento da Google Calendar
      await this._deleteCalendarEvent(eventId);

      this._showSuccessMessage('⚡ Evento Eliminato!', 'pink');

      // Rimuovi anche dall'array locale
      this._events = this._events.filter(e => e.id !== eventId);

      // Sincronizzazione completa in background
      setTimeout(() => this._forceSyncAndRefresh(null, date), 100);

      // Aggiorna la vista
      this.requestUpdate();

    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'evento:', error);
      alert(`Errore durante l'eliminazione dell'evento: ${error.message}`);

      // Se c'è stato un errore, ricarica gli eventi
      try {
        await this._fetchEvents();
        this.requestUpdate();
      } catch (refreshError) {
        console.error('Errore anche durante il refresh:', refreshError);
      }
    }
  }
}

customElements.define('better-calendar-card', BetterCalendarCard);

// Elemento di configurazione per l'editor di Home Assistant
class BetterCalendarCardEditor extends LitElement {
  static get properties() {
    return {
      _hass: { type: Object },
      _config: { type: Object },
      _availableCalendars: { type: Array }
    };
  }

  constructor() {
    super();
    this._availableCalendars = [];
  }

  setConfig(config) {
    this._config = { ...config };
  }

  set hass(hass) {
    this._hass = hass;
    this._loadAvailableEntities();
  }

  _loadAvailableEntities() {
    if (!this._hass) return;

    // Carica calendari disponibili
    this._availableCalendars = Object.keys(this._hass.states)
      .filter(eid => eid.startsWith('calendar.') && this._hass.states[eid].state !== 'unavailable')
      .map(eid => ({
        entity_id: eid,
        name: this._hass.states[eid].attributes.friendly_name || eid.split('.')[1],
        type: this._getCalendarType(eid)
      })) || [];





    this.requestUpdate();
  }

  _getCalendarType(entityId) {
    if (entityId.includes('google')) return 'Google Calendar';
    if (entityId.includes('outlook')) return 'Outlook';
    if (entityId.includes('caldav')) return 'CalDAV';
    return 'Locale';
  }

  _configChanged(field, value) {
    if (!this._config) {
      this._config = {};
    }

    this._config = { ...this._config, [field]: value };

    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _arrayConfigChanged(field, values) {
    this._configChanged(field, values);
  }

  static get styles() {
    return css`
      .config-container {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-family: 'Roboto', sans-serif;
      }

      .config-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        background: var(--card-background-color, #f8f9fa);
        border-radius: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
      }

      .config-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color, #333);
        margin-bottom: 4px;
      }

      .config-select,
      .config-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--divider-color, #ccc);
        border-radius: 4px;
        background: var(--card-background-color, white);
        color: var(--primary-text-color, #333);
        font-size: 14px;
        box-sizing: border-box;
      }

      .config-select:focus,
      .config-input:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 0 0 2px rgba(3, 169, 244, 0.2);
      }

      .config-help {
        font-size: 12px;
        color: var(--secondary-text-color, #666);
        margin-top: 4px;
        font-style: italic;
      }

      .config-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        border-radius: 24px;
        transition: .4s;
      }

      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: .4s;
      }

      input:checked + .toggle-slider {
        background-color: var(--primary-color, #03a9f4);
      }

      input:checked + .toggle-slider:before {
        transform: translateX(20px);
      }

      .multi-select {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--divider-color, #ccc);
        border-radius: 4px;
        background: var(--card-background-color, white);
      }

      .multi-select-option {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .multi-select-option:hover {
        background-color: var(--table-row-alternative-background-color, #f5f5f5);
      }

      .multi-select-option input[type="checkbox"] {
        margin-right: 8px;
      }

      .entity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
      }

      .entity-name {
        font-weight: 500;
      }

      .entity-type {
        font-size: 12px;
        color: var(--secondary-text-color, #666);
        background: var(--table-row-alternative-background-color, #f5f5f5);
        padding: 2px 6px;
        border-radius: 12px;
      }
    `;
  }

  render() {
    if (!this._hass || !this._availableCalendars) {
      return html`<div class="config-container">${this._t('loading')}</div>`;
    }

    return html`
      <div class="config-container">
        <div class="config-section">
          <div class="config-label">📅 Calendari</div>
          <div class="multi-select">
            ${this._availableCalendars.map(calendar => html`
              <div class="multi-select-option">
                <input
                  type="checkbox"
                  .checked="${(this._config.entities || []).includes(calendar.entity_id)}"
                  @change="${(e) => this._handleCalendarToggle(calendar.entity_id, e.target.checked)}"
                />
                <div class="entity-row">
                  <span class="entity-name">${calendar.name}</span>
                  <span class="entity-type">${calendar.type}</span>
                </div>
              </div>
            `)}
          </div>
          <div class="config-help">Seleziona i calendari da visualizzare. Il primo sarà quello principale per creare eventi.</div>
        </div>



        <div class="config-section">
          <div class="config-label">🌓 Tema</div>
          <ha-selector
            .hass=${this._hass}
            .selector=${{
              select: {
                mode: "dropdown",
                options: [
                  { value: "dark", label: "🌙 Scuro" },
                  { value: "light", label: "☀️ Chiaro" },
                  { value: "google-dark", label: "🌙 Google Dark" },
                  { value: "google-light", label: "☀️ Google Light" }
                ]
              }
            }}
            .value=${this._config.theme || 'dark'}
            @value-changed=${(e) => this._configChanged('theme', e.detail.value)}
          ></ha-selector>
          <div class="config-help">Scegli il tema del calendario.</div>
        </div>

        <div class="config-section">
          <div class="config-label">👁️ Vista Predefinita</div>
          <ha-selector
            .hass=${this._hass}
            .selector=${{
              select: {
                mode: "dropdown",
                options: [
                  { value: "daily", label: "📅 Giornaliera" },
                  { value: "weekly", label: "📊 Settimanale" },
                  { value: "monthly", label: "🗓️ Mensile" }
                ]
              }
            }}
            .value=${this._config.default_view || 'monthly'}
            @value-changed=${(e) => this._configChanged('default_view', e.detail.value)}
          ></ha-selector>
          <div class="config-help">Scegli la vista che si apre di default quando carichi il calendario.</div>
        </div>


      </div>
    `;
  }

  _handleCalendarToggle(entityId, checked) {
    const entities = this._config.entities || [];
    let newEntities;

    if (checked) {
      newEntities = [...entities, entityId];
    } else {
      newEntities = entities.filter(id => id !== entityId);
    }

    this._configChanged('entities', newEntities);

    // Se è il primo calendario, impostalo come principale
    if (newEntities.length > 0 && !this._config.primary_calendar) {
      this._configChanged('primary_calendar', newEntities[0]);
    }
  }


}

customElements.define('better-calendar-card-editor', BetterCalendarCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "better-calendar-card",
  name: "Better Calendar Card",
  description: "A better calendar card for Home Assistant"
});
