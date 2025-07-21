"""Coordinator per Better Calendar."""
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.components.calendar import CalendarEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers import device_registry as dr
from homeassistant.util import dt as dt_util

from .const import DOMAIN, DEVICE_MANUFACTURER, DEVICE_MODEL, DEVICE_NAME, DEFAULT_UPDATE_INTERVAL
# Sistema di notifiche ora integrato nel sensore BetterCalendarNotifications

_LOGGER = logging.getLogger(__name__)


class BetterCalendarCoordinator(DataUpdateCoordinator):
    """Coordinator per gestire i dati dei calendari."""

    def __init__(self, hass: HomeAssistant, config_entry):
        """Inizializza il coordinator."""
        self.config_entry = config_entry
        self.calendar_entities = config_entry.data.get("selected_calendars", [])
        
        # Ottieni l'intervallo di aggiornamento dalla configurazione utente
        user_update_interval = config_entry.data.get("update_interval", DEFAULT_UPDATE_INTERVAL)
        
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_{config_entry.entry_id}",
            update_interval=timedelta(minutes=user_update_interval),
        )
        self.hass = hass
        self.entry_id = config_entry.entry_id
        self.config = config_entry.data
        self._calendar_entities: Dict[str, Any] = {}
        self._events: Dict[str, List[Dict[str, Any]]] = {}
        
# Configurazione completata
        
        # File JSON per salvare gli eventi nella directory del componente
        component_dir = os.path.dirname(__file__)
        self.events_file = os.path.join(component_dir, f"better_calendar_events_{config_entry.entry_id}.json")
        
        # Crea il device
        self._setup_device()

    def _setup_device(self) -> None:
        """Configura il device per raggruppare le entità."""
        device_registry = dr.async_get(self.hass)
        
        self._device_info = {
            "identifiers": {(DOMAIN, self.entry_id)},
            "name": DEVICE_NAME,
            "manufacturer": DEVICE_MANUFACTURER,
            "model": DEVICE_MODEL,
            "sw_version": "1.0.0",
            "suggested_area": "Casa",
        }
        
        # Registra il device
        device_registry.async_get_or_create(
            config_entry_id=self.entry_id,
            **self._device_info
        )
    
    @property
    def device_info(self):
        """Restituisce le informazioni del device."""
        return self._device_info
        
    async def async_setup(self):
        """Setup del coordinator."""
        # Forza un aggiornamento immediato all'avvio
        try:
            await self.async_request_refresh()
        except Exception as e:
            _LOGGER.warning(f"⚠️ Errore durante la sincronizzazione immediata: {e}")
            pass

    async def async_unload(self):
        """Cleanup del coordinator."""
        pass

    async def async_config_entry_updated(self, hass: HomeAssistant, config_entry):
        """Gestisce l'aggiornamento della configurazione."""
        # Aggiorna i calendari selezionati
        old_calendars = self.calendar_entities
        new_calendars = config_entry.data.get("selected_calendars", [])
        
        if old_calendars != new_calendars:
            self.calendar_entities = new_calendars
        
        # Aggiorna l'intervallo di aggiornamento
        new_update_interval = config_entry.data.get("update_interval", DEFAULT_UPDATE_INTERVAL)
        current_interval_minutes = self.update_interval.total_seconds() / 60
        
        if new_update_interval != current_interval_minutes:
            self.update_interval = timedelta(minutes=new_update_interval)
            # Forza un aggiornamento immediato
            await self.async_request_refresh()
        
        # Aggiorna la configurazione interna
        self.config_entry = config_entry
        self.config = config_entry.data

    async def _async_update_data(self):
        """Fetch data from API endpoint."""
        try:
            # Verifica calendari disponibili in HA
            available_calendars = [entity_id for entity_id in self.hass.states.async_entity_ids() if entity_id.startswith("calendar.")]
            
            if not self.calendar_entities:
                # Fallback: usa tutti i calendari disponibili
                if available_calendars:
                    self.calendar_entities = available_calendars
                else:
                    _LOGGER.error("❌ Nessun calendario disponibile in Home Assistant!")
                    return {}
            
            # Ottieni la data/ora corrente
            now = datetime.now()
            
            # Estendi il range per includere eventi passati (30 giorni indietro) e futuri (120 giorni avanti)
            start_date = now.date() - timedelta(days=30)
            end_date = now.date() + timedelta(days=120)
            
            all_events = {}
            
            for entity_id in self.calendar_entities:
                try:
                    # Verifica che il calendario esista
                    if entity_id not in self.hass.states.async_entity_ids():
                        all_events[entity_id] = []
                        continue
                    
                    # Usa il servizio get_events per ottenere gli eventi
                    response = await self.hass.services.async_call(
                        "calendar",
                        "get_events",
                        {
                            "entity_id": entity_id,
                            "start_date_time": start_date.isoformat(),
                            "end_date_time": end_date.isoformat(),
                        },
                        blocking=True,
                        return_response=True,
                    )
                    
                    calendar_events = response.get(entity_id, {}).get("events", [])
                    
                    # Processa e filtra gli eventi
                    processed_events = []
                    
                    for event in calendar_events:
                        try:
                            # Assicurati che l'evento abbia i campi necessari
                            if not event.get("summary"):
                                continue
                                
                            # Normalizza le date
                            event_start = event.get("start")
                            event_end = event.get("end")
                            
                            if not event_start or not event_end:
                                continue
                            
                            # Gestisci eventi tutto il giorno vs con orario
                            if isinstance(event_start, str) and "T" not in event_start:
                                # Evento tutto il giorno
                                event["allDay"] = True
                                event["start"] = {"date": event_start}
                                event["end"] = {"date": event_end}
                            else:
                                # Evento con orario - resetta i secondi
                                event["allDay"] = False
                                if isinstance(event_start, str):
                                    # Converti in datetime, resetta secondi e riconverti in stringa
                                    start_dt = datetime.fromisoformat(event_start.replace('Z', '+00:00'))
                                    start_no_seconds = start_dt.replace(second=0, microsecond=0)
                                    event["start"] = {"dateTime": start_no_seconds.isoformat()}
                                if isinstance(event_end, str):
                                    # Stessa cosa per l'orario di fine
                                    end_dt = datetime.fromisoformat(event_end.replace('Z', '+00:00'))
                                    end_no_seconds = end_dt.replace(second=0, microsecond=0)
                                    event["end"] = {"dateTime": end_no_seconds.isoformat()}
                            
                            # Preserva l'ID originale di Google Calendar se disponibile
                            original_id = event.get("uid")
                            if original_id:
                                # Salva l'ID originale di Google Calendar
                                event["google_calendar_id"] = original_id
                                # Mantieni anche l'ID originale come UID principale
                                event["uid"] = original_id
                            else:
                                # Se non c'è un ID originale, genera uno con hash
                                event["uid"] = f"{entity_id}_{hash(str(event))}"
                                
                            # Inizializza le notifiche come array vuoto (ora gestite separatamente)
                            event["notifications"] = []
                                
                            processed_events.append(event)
                            
                        except Exception as e:
                            _LOGGER.warning(f"⚠️ Errore processando evento: {e}")
                            continue
                    
                    all_events[entity_id] = processed_events
                    
                except Exception as e:
                    _LOGGER.error(f"❌ Errore recuperando eventi da {entity_id}: {e}")
                    all_events[entity_id] = []
            
            # Salva gli eventi in un file JSON SENZA notifiche (ora gestite separatamente)
            events_file = self.events_file
            
            try:
                # Pulisci gli eventi rimuovendo le notifiche (ora gestite separatamente)
                def _clean_and_write_events_file():
                    clean_events = {}
                    for calendar_id, events in all_events.items():
                        clean_events[calendar_id] = []
                        for event in events:
                            # Rimuovi le notifiche dal file events (ora gestite separatamente)
                            event_copy = event.copy()
                            event_copy["notifications"] = []
                            clean_events[calendar_id].append(event_copy)
                    
                    # Salva solo gli eventi puliti
                    events_data = {
                        "last_updated": now.isoformat(),
                        "events": clean_events
                    }
                    
                    with open(events_file, 'w', encoding='utf-8') as f:
                        json.dump(events_data, f, ensure_ascii=False, indent=2, default=str)
                
                await self.hass.async_add_executor_job(_clean_and_write_events_file)
                _LOGGER.debug(f"✅ Eventi salvati in: {events_file}")
                    
            except Exception as e:
                _LOGGER.error(f"❌ Errore salvando eventi: {e}")
            
            return all_events
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore durante l'aggiornamento dati: {e}")
            raise UpdateFailed(f"Errore aggiornamento Better Calendar: {e}")

    async def _save_events_to_file(self, all_events: Dict[str, List[Dict[str, Any]]], calendar_entities: Dict[str, Any]) -> None:
        """Salva tutti gli eventi in un file JSON."""
        try:
            # Prepara i dati da salvare
            data_to_save = {
                "last_update": dt_util.utcnow().isoformat(),
                "calendars": calendar_entities,
                "events": all_events,
                "total_events": sum(len(events) for events in all_events.values()),
            }
            
            # Salva in modo asincrono
            def _write_file():
                with open(self.events_file, 'w', encoding='utf-8') as f:
                    json.dump(data_to_save, f, ensure_ascii=False, indent=2, default=str)
            
            await self.hass.async_add_executor_job(_write_file)
    
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nel salvare gli eventi nel file: {err}")

    async def _load_cached_data(self) -> Dict[str, Any]:
        """Carica i dati dalla cache (file JSON)."""
        try:
            if not os.path.exists(self.events_file):

                return {
                    "calendars": {},
                    "events": {},
                    "last_update": dt_util.utcnow(),
                    "events_file": self.events_file,
                    "total_events": 0,
                }
            
            def _read_file():
                with open(self.events_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            cached_data = await self.hass.async_add_executor_job(_read_file)

            # Fa il merge delle notifiche dal file separato
            merged_data = self.merge_notifications_into_events(cached_data)
            
            return {
                "calendars": merged_data.get("calendars", {}),
                "events": merged_data.get("events", {}),
                "last_update": merged_data.get("last_update", dt_util.utcnow().isoformat()),
                "events_file": self.events_file,
                "total_events": merged_data.get("total_events", 0),
            }
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nel caricare i dati dalla cache: {err}")
            return {
                "calendars": {},
                "events": {},
                "last_update": dt_util.utcnow(),
                "events_file": self.events_file,
                "total_events": 0,
            }

    def _get_calendar_entities(self) -> Dict[str, Any]:
        """Ottieni le entità calendario selezionate."""
        calendar_entities = {}
        
        # Ottieni i calendari selezionati dalla configurazione
        selected_calendars = self.config.get("selected_calendars", [])
        
        # Debug dei calendari (solo se necessario)
        all_available_calendars = self.hass.states.async_entity_ids("calendar")

        
        # Se non ci sono calendari selezionati, usa tutti quelli disponibili
        if not selected_calendars:
            selected_calendars = all_available_calendars

        
        # Debug: controlla se la lista è vuota
        if not selected_calendars:
            _LOGGER.warning(f"Better Calendar: NESSUN calendario da processare! Calendari disponibili in HA: {all_available_calendars}")
            return {}
        
        # Controlla se ci sono calendari non disponibili
        missing_calendars = []
        
        # Processa solo i calendari selezionati
        for entity_id in selected_calendars:
            if entity_id.startswith("calendar."):
                state = self.hass.states.get(entity_id)
                if state:
                    calendar_entities[entity_id] = {
                        "name": state.attributes.get("friendly_name", entity_id),
                        "state": state.state,
                        "attributes": state.attributes,
                    }
    
                else:
                    missing_calendars.append(entity_id)
                    _LOGGER.warning(f"Better Calendar: Calendario {entity_id} non trovato negli stati")
            else:
                _LOGGER.warning(f"Better Calendar: ID calendario non valido: {entity_id}")
        
        # Se ci sono calendari mancanti, suggerisci una soluzione
        if missing_calendars:
            # Solo mostra warning se TUTTI i calendari sono mancanti, altrimenti è solo un problema temporaneo
            if len(missing_calendars) == len(selected_calendars):
                _LOGGER.warning(
                    f"Better Calendar: TUTTI i {len(missing_calendars)} calendario/i configurati non sono disponibili: {missing_calendars}. "
                    f"Possibili cause: integrazione disabilitata, calendario rimosso, problema di autenticazione. "
                    f"Ricontrolla la configurazione dell'integrazione Google Calendar."
                )
            else:
                pass

        

        
        # Se non ci sono calendari validi, prova con tutti i calendari disponibili
        if not calendar_entities and all_available_calendars:
            _LOGGER.warning("Better Calendar: Nessun calendario configurato disponibile, uso TUTTI i calendari presenti in HA")
            for entity_id in all_available_calendars:
                state = self.hass.states.get(entity_id)
                if state:
                    calendar_entities[entity_id] = {
                        "name": state.attributes.get("friendly_name", entity_id),
                        "state": state.state,
                        "attributes": state.attributes,
                    }

                else:
                    _LOGGER.warning(f"Better Calendar: FALLBACK - Calendario {entity_id} non ha stato valido")
        
        # Debug finale

                    
        return calendar_entities

    async def _get_all_calendar_events(self, entity_id: str, entity_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Ottieni TUTTI gli eventi per un calendario specifico (1 anno indietro, 1 anno avanti)."""
        try:
            # Verifica se il servizio calendar.get_events è disponibile
            calendar_services = self.hass.services.async_services().get("calendar", {})
            if "get_events" not in calendar_services:
                _LOGGER.error(f"Better Calendar: Servizio calendar.get_events non disponibile! Servizi calendar: {list(calendar_services.keys())}")
                return []
            
            # Periodo di ricerca: 1 anno indietro e 1 anno avanti per avere TUTTI gli eventi
            now = dt_util.utcnow()
            start_time = now - timedelta(days=365)
            end_time = now + timedelta(days=365)
            

            
            # Chiama il servizio per ottenere gli eventi
            response = await self.hass.services.async_call(
                "calendar",
                "get_events",
                {
                    "entity_id": entity_id,
                    "start_date_time": start_time.isoformat(),
                    "end_date_time": end_time.isoformat(),
                },
                blocking=True,
                return_response=True,
            )
            
            # Estrai gli eventi dalla risposta
            events = []
            if response and entity_id in response:
                calendar_events = response[entity_id].get("events", [])
                for event in calendar_events:
                    # Normalizza l'evento
                    normalized_event = {
                        "summary": event.get("summary", "Evento senza titolo"),
                        "description": event.get("description", ""),
                        "location": event.get("location", ""),
                        "start": event.get("start", {}),
                        "end": event.get("end", {}),
                        "uid": event.get("uid", ""),
                        "recurrence_id": event.get("recurrence_id"),
                        "rrule": event.get("rrule"),
                        "calendar_id": entity_id,
                    }
                    events.append(normalized_event)
                

                    
            return events
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nel recupero eventi per {entity_id}: {err}")
            return []

    # Metodi per i sensori che leggono dal file JSON
    async def get_events_from_file(self) -> Dict[str, Any]:
        """Carica gli eventi dal file JSON per i sensori."""
        return await self._load_cached_data()

    def get_events_for_date(self, target_date: datetime) -> List[Dict[str, Any]]:
        """Ottieni eventi per una data specifica dal file JSON."""
        try:
            if not os.path.exists(self.events_file):
                return []
            
            with open(self.events_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            events_for_date = []
            target_date_str = target_date.date().isoformat()
            
            for calendar_id, events in data.get("events", {}).items():
                for event in events:
                    # Controlla se l'evento è nella data target
                    start_info = event.get("start", {})
                    
                    # Gestisci eventi all-day
                    if "date" in start_info:
                        event_date = start_info["date"]
                        if event_date == target_date_str:
                            events_for_date.append(event)
                    # Gestisci eventi con orario
                    elif "dateTime" in start_info:
                        event_datetime = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                        if event_datetime.date().isoformat() == target_date_str:
                            events_for_date.append(event)
            
            return events_for_date
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nel leggere eventi per data {target_date}: {err}")
            return []

    def get_events_for_period(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Ottieni eventi per un periodo specifico dal file JSON."""
        try:
            if not os.path.exists(self.events_file):
                return []
            
            with open(self.events_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            events_for_period = []
            start_date_str = start_date.date().isoformat()
            end_date_str = end_date.date().isoformat()
            
            for calendar_id, events in data.get("events", {}).items():
                for event in events:
                    # Controlla se l'evento è nel periodo
                    start_info = event.get("start", {})
                    
                    # Gestisci eventi all-day
                    if "date" in start_info:
                        event_date = start_info["date"]
                        if start_date_str <= event_date <= end_date_str:
                            events_for_period.append(event)
                    # Gestisci eventi con orario
                    elif "dateTime" in start_info:
                        event_datetime = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                        event_date_str = event_datetime.date().isoformat()
                        if start_date_str <= event_date_str <= end_date_str:
                            events_for_period.append(event)
            
            return events_for_period
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nel leggere eventi per periodo {start_date} - {end_date}: {err}")
            return []

    @callback
    def get_events_for_calendar(self, calendar_id: str) -> List[Dict[str, Any]]:
        """Ottieni eventi per un calendario specifico."""
        if self.data and "events" in self.data:
            return self.data["events"].get(calendar_id, [])
        return []

    @callback
    def get_all_events(self) -> List[Dict[str, Any]]:
        """Ottieni tutti gli eventi."""
        all_events = []
        if self.data and "events" in self.data:
            for events in self.data["events"].values():
                all_events.extend(events)
        return all_events

    @callback
    def get_upcoming_events(self, days: int = 7) -> List[Dict[str, Any]]:
        """Ottieni eventi futuri entro X giorni."""
        now = dt_util.utcnow()
        end_date = now + timedelta(days=days)
        return self.get_events_for_period(now, end_date)

    def _get_event_start_datetime(self, event: Dict[str, Any]) -> datetime:
        """Ottieni la data/ora di inizio dell'evento."""
        start_info = event.get("start", {})
        
        if "dateTime" in start_info:
            return datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
        elif "date" in start_info:
            return datetime.fromisoformat(start_info["date"] + "T00:00:00")
        else:
            return dt_util.utcnow() 

    async def force_update_now(self) -> Dict[str, Any]:
        """Forza un aggiornamento immediato dei dati."""
        try:
    
            
            # Forza l'aggiornamento
            data = await self._async_update_data()
            
            result = {
                "update_result": data,
                "success": True
            }
            

            return result
            
        except Exception as err:
            _LOGGER.error(f"Better Calendar: Errore nell'aggiornamento forzato: {err}")
            return {"success": False, "error": str(err)}

    # Metodi per gestire le notifiche
    # Metodo add_notification rimosso - ora gestito dal sensore BetterCalendarNotifications
    
    async def remove_notification(self, notification_id: str) -> bool:
        """Rimuove una notifica dal file events."""
        # Questo metodo ora è obsoleto perché le notifiche vengono gestite direttamente nel sensore
        # e modificate nel file events
        _LOGGER.warning("❌ Metodo obsoleto: remove_notification nel coordinator. Usa il sensore BetterCalendarNotifications")
        return False
    

    
    def get_notifications_for_event(self, event_id: str) -> List[Dict]:
        """Ottiene le notifiche per un evento dal file events."""
        try:
            if not os.path.exists(self.events_file):
                return []
            
            def _read_events_file():
                with open(self.events_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            events_data = _read_events_file()
            
            # Cerca l'evento e le sue notifiche
            for calendar_id, events in events_data.get("events", {}).items():
                for event in events:
                    if event.get("uid") == event_id:
                        return event.get("notifications", [])
            
            return []
            
        except Exception as e:
            return []
    
    def get_all_notifications(self) -> Dict[str, Dict]:
        """Ottiene tutte le notifiche dal file events."""
        try:
            if not os.path.exists(self.events_file):
                return {}
            
            def _read_events_file():
                with open(self.events_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            events_data = _read_events_file()
            
            # Estrai tutte le notifiche
            all_notifications = {}
            for calendar_id, events in events_data.get("events", {}).items():
                for event in events:
                    event_notifications = event.get("notifications", [])
                    for notification in event_notifications:
                        notif_id = notification.get("id")
                        if notif_id:
                            all_notifications[notif_id] = notification
            
            return all_notifications
            
        except Exception as e:
            return {}

    async def create_event(self, event_data: Dict[str, Any]) -> str:
        """Crea un nuovo evento."""
        try:
            # Estrai i dati dell'evento
            summary = event_data["summary"]
            description = event_data.get("description", "")
            start_datetime = event_data["start_datetime"]
            end_datetime = event_data["end_datetime"]
            all_day = event_data.get("all_day", False)
            has_notification = event_data.get("has_notification", False)
            notification_time = event_data.get("notification_time")
            
            # Genera un ID evento unico
            event_id = f"better_calendar_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(summary)}"
            
            # Prepara l'evento per il calendario principale
            if self.calendar_entities:
                main_calendar = self.calendar_entities[0]
                
                # Crea l'evento nel calendario di Home Assistant
                event_service_data = {
                    "summary": summary,
                    "description": description
                }
                
                if all_day:
                    # Per eventi tutto il giorno, usa solo la data
                    start_date = start_datetime.split('T')[0] if 'T' in start_datetime else start_datetime
                    end_date = end_datetime.split('T')[0] if 'T' in end_datetime else end_datetime
                    event_service_data["dtstart"] = {"date": start_date}
                    event_service_data["dtend"] = {"date": end_date}
                else:
                    # Per eventi con orario specifico
                    event_service_data["dtstart"] = start_datetime
                    event_service_data["dtend"] = end_datetime
                
                # Chiama il servizio per creare l'evento
                await self.hass.services.async_call(
                    "calendar",
                    "create_event",
                    {
                        "entity_id": main_calendar,
                        "event": event_service_data
                    }
                )
                
                            # Gestione notifiche ora delegata al sensore BetterCalendarNotifications
                
                # Forza aggiornamento dati
                await self.async_refresh()
                
                return event_id
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore creando evento: {e}")
            raise

    async def update_event(self, event_data: Dict[str, Any]) -> bool:
        """Aggiorna un evento esistente."""
        try:
            event_id = event_data["event_id"]
            summary = event_data["summary"]
            description = event_data.get("description", "")
            start_datetime = event_data["start_datetime"]
            end_datetime = event_data["end_datetime"]
            all_day = event_data.get("all_day", False)
            has_notification = event_data.get("has_notification", False)
            notification_time = event_data.get("notification_time")
            
            # Per ora, simuliamo l'aggiornamento eliminando e ricreando l'evento
            # Questo è un approccio semplificato - in una implementazione più complessa
            # dovresti cercare l'evento esistente e aggiornarlo direttamente
            
            # Gestione notifiche ora delegata al sensore BetterCalendarNotifications
            
            # Forza aggiornamento dati
            await self.async_refresh()
            
            return True
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore aggiornando evento: {e}")
            return False

    async def delete_event(self, event_id: str) -> bool:
        """Elimina un evento."""
        try:
            # Gestione notifiche ora delegata al sensore BetterCalendarNotifications
            
            # Per l'eliminazione diretta dal calendario HA, avremmo bisogno dell'UID
            # Per ora gestiamo solo la rimozione delle notifiche
            # In una implementazione completa, dovresti trovare e eliminare l'evento dal calendario
            
            # Forza aggiornamento dati
            await self.async_refresh()
            
            return True
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore eliminando evento: {e}")
            return False

    # Metodo toggle_notification rimosso - ora gestito dal sensore BetterCalendarNotifications



    def merge_notifications_into_events(self, events_data: dict) -> dict:
        """Fa il merge delle notifiche dal file separato negli eventi."""
        try:
            # Trova il file delle notifiche
            component_dir = os.path.dirname(__file__)
            notifications_file = os.path.join(component_dir, f"better_calendar_notifications_{self.entry_id}.json")
            
            if not os.path.exists(notifications_file):
                return events_data
            
            # Carica le notifiche dal file separato
            with open(notifications_file, 'r', encoding='utf-8') as f:
                notifications_data = json.load(f)
            
            # Fa il merge delle notifiche negli eventi
            merged_events = events_data.copy()
            
            for calendar_id, events in merged_events.get("events", {}).items():
                for event in events:
                    # Resetta le notifiche per l'evento
                    event["notifications"] = []
                    
                    # Trova tutte le notifiche per questo evento
                    for notif_id, notification in notifications_data.items():
                        # Controlla se la notifica appartiene a questo evento
                        if (notification.get('event_id') == event.get('uid') or
                            (notification.get('event_summary') == event.get('summary') and
                             self._event_start_matches(event.get('start', {}), notification.get('event_start')))):
                            
                            # Converti dal formato interno al formato del file events
                            event_notification = {
                                'id': notif_id,
                                'type': notification.get('notification_type', 'push'),
                                'offset_minutes': notification.get('offset_minutes', 15),
                                'target_device': notification.get('target_device', 'auto'),
                                'custom_message_push': notification.get('custom_message_push'),
                                'custom_message_alexa': notification.get('custom_message_alexa'),
                                'created_at': notification.get('created_at'),
                                'enabled': notification.get('enabled', True)
                            }
                            
                            event["notifications"].append(event_notification)
            
            return merged_events
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore merge notifiche: {e}")
            return events_data
    
    def _event_start_matches(self, event_start: dict, notification_start: str) -> bool:
        """Verifica se la data di inizio dell'evento corrisponde a quella della notifica."""
        if not event_start or not notification_start:
            return False
        
        # Estrai la data dall'evento
        event_start_str = ""
        if "dateTime" in event_start:
            event_start_str = event_start["dateTime"]
        elif "date" in event_start:
            event_start_str = event_start["date"]
        
        return event_start_str == notification_start or notification_start in event_start_str