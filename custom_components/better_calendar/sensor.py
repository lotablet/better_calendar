"""Sensori per Better Calendar."""
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import DOMAIN, ATTR_START_TIME, ATTR_END_TIME, ATTR_SUMMARY, ATTR_DESCRIPTION, ATTR_LOCATION, ATTR_CALENDAR_NAME
from .coordinator import BetterCalendarCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Configura i sensori Better Calendar."""
    coordinator: BetterCalendarCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    # Crea il sensore notifiche
    notifications_sensor = BetterCalendarNotifications(coordinator)
    
    entities = [
        BetterCalendarSummary(coordinator),
        BetterCalendarUpcoming(coordinator),
        BetterCalendarYesterday(coordinator),
        BetterCalendarToday(coordinator),
        BetterCalendarTomorrow(coordinator),
        BetterCalendarThisWeek(coordinator),
        notifications_sensor,
    ]

    # Salva il sensore notifiche nei dati per accesso facile dai servizi
    hass.data[DOMAIN][entry.entry_id]["notifications_sensor"] = notifications_sensor

    async_add_entities(entities)


class BetterCalendarSensorBase(CoordinatorEntity, SensorEntity):
    """Classe base per i sensori Better Calendar."""

    def __init__(self, coordinator: BetterCalendarCoordinator, sensor_type: str) -> None:
        super().__init__(coordinator)
        self._coordinator = coordinator
        self._sensor_type = sensor_type
        self._name = f"Better Calendar {sensor_type.replace('_', ' ').title()}"
        
        # Gestione device_info
        try:
            # Verifica il tipo di coordinator
            if hasattr(coordinator, 'device_info') and coordinator.device_info:
                device_info = coordinator.device_info
            elif isinstance(coordinator, dict) and "device_info" in coordinator:
                device_info = coordinator["device_info"]
            else:
                # Fallback
                device_info = {
                    "identifiers": {(DOMAIN, "better_calendar")},
                    "name": "Better Calendar",
                    "manufacturer": "Better Calendar",
                    "model": "Calendar Sensor",
                    "sw_version": "1.0",
                }
            
            self._device_info = device_info
            
        except Exception as e:
            # Fallback
            self._device_info = {
                "identifiers": {(DOMAIN, "better_calendar")},
                "name": "Better Calendar",
                "manufacturer": "Better Calendar",
                "model": "Calendar Sensor",
                "sw_version": "1.0",
            }
        
        self._attr_unique_id = f"{DOMAIN}_{coordinator.entry_id}_{sensor_type}"
        self._attr_should_poll = False
        self._attr_name = self._name
        self._attr_has_entity_name = False
        
    @property
    def coordinator(self):
        """Restituisce il coordinator."""
        return self._coordinator

    @coordinator.setter
    def coordinator(self, value):
        """Imposta il coordinator (richiesto da CoordinatorEntity)."""
        self._coordinator = value

    @property
    def device_info(self) -> DeviceInfo:
        return self._device_info
    
    @property
    def name(self) -> str:
        """Restituisce il nome del sensore."""
        return self._name

    async def async_update(self):
        """Aggiorna il sensore."""
        # Il sensore si aggiorna automaticamente quando viene chiamato native_value

    def _load_events_from_file(self) -> Dict[str, Any]:
        """Carica gli eventi dal coordinator."""
        try:
            # Prima opzione: usa i dati del coordinator se disponibili
            if hasattr(self.coordinator, 'data') and self.coordinator.data:
                events_data = self.coordinator.data
                
                return {
                    "events": events_data,
                    "calendars": {},
                    "last_update": dt_util.utcnow().isoformat()
                }
            
            # Seconda opzione: usa il metodo del coordinator per ottenere eventi
            if hasattr(self.coordinator, 'get_all_events'):
                try:
                    all_events = self.coordinator.get_all_events()
                    if all_events:
                        # Raggruppa eventi per calendario 
                        events_data = {}
                        for event in all_events:
                            calendar_id = event.get('calendar', 'unknown')
                            if calendar_id not in events_data:
                                events_data[calendar_id] = []
                            events_data[calendar_id].append(event)
                        
                        return {
                            "events": events_data,
                            "calendars": {},
                            "last_update": dt_util.utcnow().isoformat()
                        }
                except Exception as e:
                    pass
            
            # Fallback: restituisci dati vuoti
            return {"events": {}, "calendars": {}}
            
        except Exception as err:
            return {"events": {}, "calendars": {}}

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Restituisce gli attributi aggiuntivi del sensore."""
        data = self._load_events_from_file()
        return {
            "last_update": data.get("last_update"),
            "calendars_count": len(data.get("calendars", {})),
        }


class BetterCalendarSummary(BetterCalendarSensorBase):
    """Sensore che mostra un riassunto generale."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore summary."""
        super().__init__(coordinator, "summary")
        self._attr_icon = "mdi:calendar-multiple"

    @property
    def native_value(self) -> int:
        """Restituisce il numero totale di eventi."""
        data = self._load_events_from_file()
        events_data = data.get("events", {})
        
        # Conta tutti gli eventi
        total_events = sum(len(events) for events in events_data.values())
        
        return total_events

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Attributi aggiuntivi del sensore summary."""
        attrs = super().extra_state_attributes
        data = self._load_events_from_file()
        
        calendars = data.get("calendars", {})
        attrs.update({
            "calendars": list(calendars.keys()),
            "calendar_names": [cal.get("name", cal_id) for cal_id, cal in calendars.items()],
        })
        
        return attrs


class BetterCalendarUpcoming(BetterCalendarSensorBase):
    """Sensore per gli eventi prossimi (prossimi 7 giorni)."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore upcoming."""
        super().__init__(coordinator, "upcoming")
        self._attr_icon = "mdi:calendar-clock"

    @property
    def native_value(self) -> int:
        """Restituisce il numero di eventi nei prossimi 7 giorni."""
        upcoming_events = self._get_upcoming_events()
        return len(upcoming_events)

    def _get_upcoming_events(self) -> List[Dict[str, Any]]:
        """Ottieni eventi nei prossimi 7 giorni dal file JSON."""
        data = self._load_events_from_file()
        events_data = data.get("events", {})
        
        now = dt_util.utcnow()
        end_date = now + timedelta(days=7)
        upcoming_events = []
        
        for calendar_id, events in events_data.items():
            for event in events:
                event_start = self._get_event_start_datetime(event)
                if event_start and now <= event_start <= end_date:
                    # Aggiungi info calendario
                    event_copy = event.copy()
                    calendar_info = data.get("calendars", {}).get(calendar_id, {})
                    event_copy["calendar_name"] = calendar_info.get("name", calendar_id)
                    upcoming_events.append(event_copy)
        
        # Ordina per data di inizio
        upcoming_events.sort(key=lambda x: self._get_event_start_datetime(x))
        return upcoming_events

    def _get_event_start_datetime(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Ottieni la data/ora di inizio dell'evento."""
        start_info = event.get("start", {})
        
        # Se start_info è una stringa, gestiscila direttamente
        if isinstance(start_info, str):
            try:
                if "T" in start_info:
                    # Formato datetime: 2025-08-17T16:00:00+02:00
                    dt = datetime.fromisoformat(start_info.replace("Z", "+00:00"))
                    # Assicurati che abbia timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_util.UTC)
                    return dt
                else:
                    # Formato solo data: 2025-06-27 - aggiungi timezone UTC
                    dt = datetime.fromisoformat(start_info + "T00:00:00")
                    return dt.replace(tzinfo=dt_util.UTC)
            except Exception as e:
                return None
        
        # Caso normale: start_info è un dizionario
        elif isinstance(start_info, dict):
            if "dateTime" in start_info:
                try:
                    dt = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                    # Assicurati che abbia timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_util.UTC)
                    return dt
                except:
                    parsed_dt = dt_util.parse_datetime(start_info["dateTime"])
                    return parsed_dt if parsed_dt else None
            elif "date" in start_info:
                try:
                    dt = datetime.fromisoformat(start_info["date"] + "T00:00:00")
                    return dt.replace(tzinfo=dt_util.UTC)
                except:
                    date_obj = dt_util.parse_date(start_info["date"])
                    return dt_util.start_of_local_day(date_obj) if date_obj else None
        
        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Attributi aggiuntivi per gli eventi prossimi."""
        attrs = super().extra_state_attributes
        
        upcoming_events = self._get_upcoming_events()
        events_list = []
        
        for event in upcoming_events[:10]:  # Limita a 10 eventi
            event_attr = {
                ATTR_SUMMARY: event.get("summary", ""),
                ATTR_CALENDAR_NAME: event.get("calendar_name", ""),
                ATTR_START_TIME: self._format_event_time(event.get("start", {})),
                ATTR_END_TIME: self._format_event_time(event.get("end", {})),
            }
            
            if event.get("description"):
                event_attr[ATTR_DESCRIPTION] = event["description"]
            if event.get("location"):
                event_attr[ATTR_LOCATION] = event["location"]
                
            events_list.append(event_attr)
        
        attrs["events"] = events_list
        return attrs

    def _format_event_time(self, time_data: Dict[str, Any]) -> Optional[str]:
        """Formatta il tempo dell'evento."""
        # Se time_data è una stringa, restituiscila direttamente
        if isinstance(time_data, str):
            return time_data
        
        # Caso normale: time_data è un dizionario
        elif isinstance(time_data, dict):
            if "dateTime" in time_data:
                return time_data["dateTime"]
            elif "date" in time_data:
                return time_data["date"]
        
        return None


class BetterCalendarDayBase(BetterCalendarSensorBase):
    """Classe base per i sensori giornalieri."""

    def __init__(self, coordinator: BetterCalendarCoordinator, sensor_type: str, day_offset: int) -> None:
        """Inizializza il sensore giornaliero."""
        super().__init__(coordinator, sensor_type)
        self._day_offset = day_offset

    @property
    def native_value(self) -> int:
        """Restituisce il numero di eventi del giorno."""
        day_events = self._get_day_events()
        return len(day_events)

    def _get_day_events(self) -> List[Dict[str, Any]]:
        """Ottieni eventi per il giorno specificato."""
        data = self._load_events_from_file()
        events_data = data.get("events", {})
        
        # Calcola la data target
        target_date = dt_util.utcnow() + timedelta(days=self._day_offset)
        target_date_str = target_date.strftime("%Y-%m-%d")
        
        day_events = []
        for calendar_id, events in events_data.items():
            for event in events:
                if self._is_event_in_day(event, target_date_str):
                    day_events.append(event)
        
        return day_events

    def _is_event_in_day(self, event: Dict[str, Any], target_date_str: str) -> bool:
        """Controlla se l'evento è nel giorno specificato."""
        start_info = event.get("start", {})
        
        if not start_info:
            return False
        
        # Controlla il tipo di start_info
        if isinstance(start_info, str):
            # Se start_info è una stringa, potrebbe essere un formato di data diretto
            # Prova a gestire come data ISO
            if "T" in start_info:
                # Formato datetime: 2025-08-17T16:00:00+02:00
                event_date = start_info.split("T")[0]
            else:
                # Formato solo data: 2025-06-27
                event_date = start_info[:10] if len(start_info) >= 10 else start_info
            
            return event_date == target_date_str
        
        # Caso normale: start_info è un dizionario
        elif isinstance(start_info, dict):
            # Caso 1: Evento all-day con campo "date"
            if "date" in start_info:
                event_date = start_info["date"]
                return event_date == target_date_str
            
            # Caso 2: Evento con orario con campo "dateTime"
            elif "dateTime" in start_info:
                event_datetime_str = start_info["dateTime"]
                # Estrai solo la data (rimuovi l'ora e timezone)
                if "T" in event_datetime_str:
                    event_date = event_datetime_str.split("T")[0]
                else:
                    event_date = event_datetime_str[:10]
                
                return event_date == target_date_str
            
            else:
                return False
        
        else:
            return False

    def _get_event_start_datetime(self, event: Dict[str, Any]) -> Optional[datetime]:
        """Ottieni la data/ora di inizio dell'evento."""
        start_info = event.get("start", {})
        
        # Se start_info è una stringa, gestiscila direttamente
        if isinstance(start_info, str):
            try:
                if "T" in start_info:
                    # Formato datetime: 2025-08-17T16:00:00+02:00
                    dt = datetime.fromisoformat(start_info.replace("Z", "+00:00"))
                    # Assicurati che abbia timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_util.UTC)
                    return dt
                else:
                    # Formato solo data: 2025-06-27 - aggiungi timezone UTC
                    dt = datetime.fromisoformat(start_info + "T00:00:00")
                    return dt.replace(tzinfo=dt_util.UTC)
            except Exception as e:
                return None
        
        # Caso normale: start_info è un dizionario
        elif isinstance(start_info, dict):
            if "dateTime" in start_info:
                try:
                    dt = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                    # Assicurati che abbia timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_util.UTC)
                    return dt
                except:
                    parsed_dt = dt_util.parse_datetime(start_info["dateTime"])
                    return parsed_dt if parsed_dt else None
            elif "date" in start_info:
                try:
                    dt = datetime.fromisoformat(start_info["date"] + "T00:00:00")
                    return dt.replace(tzinfo=dt_util.UTC)
                except:
                    date_obj = dt_util.parse_date(start_info["date"])
                    return dt_util.start_of_local_day(date_obj) if date_obj else None
        
        return None

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Attributi aggiuntivi per gli eventi del giorno."""
        attrs = super().extra_state_attributes
        
        day_events = self._get_day_events()
        events_list = []
        
        for event in day_events:
            event_attr = {
                ATTR_SUMMARY: event.get("summary", ""),
                ATTR_CALENDAR_NAME: event.get("calendar_name", ""),
                ATTR_START_TIME: self._format_event_time(event.get("start", {})),
                ATTR_END_TIME: self._format_event_time(event.get("end", {})),
            }
            
            if event.get("description"):
                event_attr[ATTR_DESCRIPTION] = event["description"]
            if event.get("location"):
                event_attr[ATTR_LOCATION] = event["location"]
                
            events_list.append(event_attr)
        
        attrs["events"] = events_list
        return attrs

    def _format_event_time(self, time_data: Dict[str, Any]) -> Optional[str]:
        """Formatta il tempo dell'evento."""
        # Se time_data è una stringa, restituiscila direttamente
        if isinstance(time_data, str):
            return time_data
        
        # Caso normale: time_data è un dizionario
        elif isinstance(time_data, dict):
            if "dateTime" in time_data:
                return time_data["dateTime"]
            elif "date" in time_data:
                return time_data["date"]
        
        return None


class BetterCalendarYesterday(BetterCalendarDayBase):
    """Sensore per gli eventi di ieri."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore yesterday."""
        super().__init__(coordinator, "yesterday", -1)
        self._attr_icon = "mdi:calendar-minus"


class BetterCalendarToday(BetterCalendarDayBase):
    """Sensore per gli eventi di oggi."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore today."""
        super().__init__(coordinator, "today", 0)
        self._attr_icon = "mdi:calendar-today"


class BetterCalendarTomorrow(BetterCalendarDayBase):
    """Sensore per gli eventi di domani."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore tomorrow."""
        super().__init__(coordinator, "tomorrow", 1)
        self._attr_icon = "mdi:calendar-plus"


class BetterCalendarThisWeek(BetterCalendarSensorBase):
    """Sensore per gli eventi di questa settimana."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore this week."""
        super().__init__(coordinator, "this_week")
        self._attr_icon = "mdi:calendar-week"

    @property
    def native_value(self) -> int:
        """Restituisce il numero di eventi di questa settimana."""
        week_events = self._get_week_events()
        return len(week_events)

    def _get_week_events(self) -> List[Dict[str, Any]]:
        """Ottieni eventi di questa settimana dal file JSON."""
        data = self._load_events_from_file()
        events_data = data.get("events", {})
        
        now = dt_util.utcnow()
        # Inizio settimana (lunedì)
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        # Fine settimana (domenica)
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        week_events = []
        start_date_str = start_of_week.date().isoformat()
        end_date_str = end_of_week.date().isoformat()
        
        for calendar_id, events in events_data.items():
            for event in events:
                if self._is_event_in_week(event, start_date_str, end_date_str):
                    # Aggiungi info calendario
                    event_copy = event.copy()
                    calendar_info = data.get("calendars", {}).get(calendar_id, {})
                    event_copy["calendar_name"] = calendar_info.get("name", calendar_id)
                    week_events.append(event_copy)
        
        # Ordina per data di inizio
        week_events.sort(key=lambda x: self._get_event_start_datetime(x))
        return week_events

    def _is_event_in_week(self, event: Dict[str, Any], start_date_str: str, end_date_str: str) -> bool:
        """Controlla se un evento è in questa settimana."""
        start_info = event.get("start", {})
        
        # Se start_info è una stringa, gestiscila direttamente
        if isinstance(start_info, str):
            try:
                if "T" in start_info:
                    # Formato datetime: 2025-08-17T16:00:00+02:00
                    event_datetime = datetime.fromisoformat(start_info.replace("Z", "+00:00"))
                    event_date_str = event_datetime.date().isoformat()
                else:
                    # Formato solo data: 2025-06-27
                    event_date_str = start_info
                
                return start_date_str <= event_date_str <= end_date_str
                
            except Exception as e:
                return False
        
        # Caso normale: start_info è un dizionario
        if "date" in start_info:
            # Evento tutto il giorno
            event_date_str = start_info["date"]
            return start_date_str <= event_date_str <= end_date_str
        elif "dateTime" in start_info:
            # Evento con orario
            try:
                event_datetime = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                event_date_str = event_datetime.date().isoformat()
                return start_date_str <= event_date_str <= end_date_str
            except Exception as e:
                return False
        
        return False

    def _get_event_start_datetime(self, event: Dict[str, Any]) -> datetime:
        """Ottieni la data/ora di inizio dell'evento."""
        start_info = event.get("start", {})
        
        # Se start_info è una stringa, gestiscila direttamente
        if isinstance(start_info, str):
            try:
                if "T" in start_info:
                    # Formato datetime: 2025-08-17T16:00:00+02:00
                    dt = datetime.fromisoformat(start_info.replace("Z", "+00:00"))
                    # Assicurati che abbia timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=dt_util.UTC)
                    return dt
                else:
                    # Formato solo data: 2025-06-27 - aggiungi timezone UTC
                    dt = datetime.fromisoformat(start_info + "T00:00:00")
                    return dt.replace(tzinfo=dt_util.UTC)
            except Exception as e:
                return dt_util.utcnow()
        
        # Caso normale: start_info è un dizionario
        if "dateTime" in start_info:
            try:
                dt = datetime.fromisoformat(start_info["dateTime"].replace("Z", "+00:00"))
                # Assicurati che abbia timezone
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=dt_util.UTC)
                return dt
            except Exception as e:
                return dt_util.utcnow()
        elif "date" in start_info:
            try:
                # Evento tutto il giorno - aggiungi timezone UTC
                dt = datetime.fromisoformat(start_info["date"] + "T00:00:00")
                return dt.replace(tzinfo=dt_util.UTC)
            except Exception as e:
                return dt_util.utcnow()
        else:
            return dt_util.utcnow()

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Attributi aggiuntivi del sensore this week."""
        attrs = super().extra_state_attributes
        
        week_events = self._get_week_events()
        
        # Aggiungi informazioni sui primi 10 eventi
        events_info = []
        for event in week_events[:10]:  # Limita a 10 eventi per non sovraccaricare
            start_time = self._format_event_time(event.get("start", {}))
            end_time = self._format_event_time(event.get("end", {}))
            
            event_info = {
                ATTR_SUMMARY: event.get("summary", ""),
                ATTR_DESCRIPTION: event.get("description", ""),
                ATTR_LOCATION: event.get("location", ""),
                ATTR_START_TIME: start_time,
                ATTR_END_TIME: end_time,
                ATTR_CALENDAR_NAME: event.get("calendar_name", ""),
            }
            events_info.append(event_info)
        
        attrs["events"] = events_info
        attrs["week_start"] = (dt_util.utcnow() - timedelta(days=dt_util.utcnow().weekday())).date().isoformat()
        attrs["week_end"] = ((dt_util.utcnow() - timedelta(days=dt_util.utcnow().weekday())) + timedelta(days=6)).date().isoformat()
        
        return attrs

    def _format_event_time(self, time_data: Dict[str, Any]) -> Optional[str]:
        """Formatta l'orario dell'evento."""
        if isinstance(time_data, str):
            return time_data
        
        if "dateTime" in time_data:
            try:
                dt = datetime.fromisoformat(time_data["dateTime"].replace("Z", "+00:00"))
                return dt.strftime("%H:%M")
            except Exception:
                return time_data["dateTime"]
        elif "date" in time_data:
            return "Tutto il giorno"
        
        return None


class BetterCalendarNotifications(BetterCalendarSensorBase):
    """Sensore per gestire le notifiche programmate."""

    def __init__(self, coordinator: BetterCalendarCoordinator) -> None:
        """Inizializza il sensore notifiche."""
        super().__init__(coordinator, "notifications")
        self._attr_icon = "mdi:bell-ring"
        self._notifications_file = None
        self._notifications_data = {}
        self._running = False
        self._unsub_timer = None
        self._unsub_cleanup_timer = None
        self._init_notifications_file()

    def _init_notifications_file(self) -> None:
        """Inizializza il file delle notifiche SEPARATO."""
        # Usa la stessa directory del coordinator
        component_dir = os.path.dirname(__file__)
        
        # Prova a ottenere l'entry_id in vari modi
        entry_id = None
        
        # Opzione 1: dal coordinator direttamente
        if hasattr(self.coordinator, 'entry_id'):
            entry_id = self.coordinator.entry_id
        
        # Opzione 2: dal hass data se il coordinator ha config_entry
        elif hasattr(self.coordinator, 'config_entry') and self.coordinator.config_entry:
            entry_id = self.coordinator.config_entry.entry_id
            
        # Opzione 3: cerca negli eventi esistenti per derivare l'entry_id
        elif os.path.exists(component_dir):
            for filename in os.listdir(component_dir):
                if filename.startswith("better_calendar_events_") and filename.endswith(".json"):
                    # Estrai l'entry_id dal nome file degli eventi
                    entry_id = filename.replace("better_calendar_events_", "").replace(".json", "")
                    break
        
        # Fallback
        if not entry_id:
            entry_id = "01JYYMT61YXPANV9ND60M6NPFS"  # Usa l'entry_id che vedo nei file esistenti
            
        self._notifications_file = os.path.join(component_dir, f"better_calendar_notifications_{entry_id}.json")
        
        # Crea il file se non esiste
        if not os.path.exists(self._notifications_file):
            try:
                with open(self._notifications_file, 'w', encoding='utf-8') as f:
                    json.dump({}, f, ensure_ascii=False, indent=2)
                _LOGGER.info(f"✅ Creato file notifiche separato: {self._notifications_file}")
            except Exception as e:
                _LOGGER.error(f"❌ Errore creando file notifiche: {e}")

    async def async_added_to_hass(self) -> None:
        """Chiamato quando il sensore viene aggiunto a Home Assistant."""
        await super().async_added_to_hass()
        # Carica le notifiche esistenti
        await self._load_notifications()
        # Pulizia immediata all'avvio
        await self._cleanup_expired_notifications()
        # Avvia il sistema di controllo notifiche
        await self._start_notification_system()

    async def _load_notifications(self) -> None:
        """Carica le notifiche dal file separato."""
        try:
            # Carica le notifiche dal file separato
            if os.path.exists(self._notifications_file):
                def _read_file():
                    with open(self._notifications_file, 'r', encoding='utf-8') as f:
                        return json.load(f)
                
                notifications_data = await self.hass.async_add_executor_job(_read_file)
                self._notifications_data = notifications_data
                
                # Auto-pulisci notifiche scadute
                await self._cleanup_expired_notifications()
                
            else:
                self._notifications_data = {}
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore caricando notifiche dal file separato: {e}")
            self._notifications_data = {}

    def _extract_event_start(self, event_start: Dict[str, Any]) -> str:
        """Estrai la data/ora di inizio dall'evento."""
        if "dateTime" in event_start:
            return event_start["dateTime"]
        elif "date" in event_start:
            return event_start["date"]
        else:
            return ""

    async def _save_notifications(self) -> None:
        """Salva le notifiche nel file separato."""
        try:
            def _write_file():
                with open(self._notifications_file, 'w', encoding='utf-8') as f:
                    json.dump(self._notifications_data, f, ensure_ascii=False, indent=2, default=str)
            
            await self.hass.async_add_executor_job(_write_file)
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore salvando notifiche nel file separato: {e}")

    async def _cleanup_expired_notifications(self) -> None:
        """Rimuove le notifiche scadute e vecchie."""
        try:
            now = dt_util.utcnow()
            expired_notifications = []
            passed_event_notifications = []
            very_old_notifications = []
            
            _LOGGER.debug(f"🧹 Avvio pulizia notifiche - Totale notifiche: {len(self._notifications_data)}")
            
            for notif_id, notification in self._notifications_data.items():
                try:
                    # Calcola quando doveva essere inviata la notifica
                    event_start_str = notification['event_start'].replace('Z', '+00:00')
                    event_start = datetime.fromisoformat(event_start_str)
                    
                    # Assicurati che event_start sia timezone-aware come now
                    if event_start.tzinfo is None:
                        event_start = dt_util.as_utc(event_start)
                    
                    offset_minutes = notification['offset_minutes']
                    notification_time = event_start - timedelta(minutes=offset_minutes)
                    
                    # Pulizia aggressiva per notifiche molto vecchie (più di 7 giorni)
                    if notification_time < now - timedelta(days=7):
                        very_old_notifications.append(notif_id)
                        continue
                    
                    # Pulizia per eventi già passati (l'evento è finito)
                    if event_start < now:
                        passed_event_notifications.append(notif_id)
                        _LOGGER.info(f"🗑️ Evento passato: {notification.get('event_summary')} - Rimuovo notifica {notif_id}")
                        continue
                    
                    # Pulizia notifiche scadute da più di 2 ore
                    if notification_time < now - timedelta(hours=2):
                        expired_notifications.append(notif_id)
                        _LOGGER.info(f"⏰ Notifica scaduta: {notification.get('event_summary')} - Rimuovo notifica {notif_id}")
                        
                except Exception as e:
                    _LOGGER.warning(f"⚠️ Errore parsing notifica {notif_id}: {e}")
                    # Se c'è un errore nel parsing, rimuovi notifiche molto vecchie per creazione
                    try:
                        created_at_str = notification.get("created_at", "")
                        created_at = datetime.fromisoformat(created_at_str)
                        
                        # Assicurati che created_at sia timezone-aware come now
                        if created_at.tzinfo is None:
                            created_at = dt_util.as_utc(created_at)
                        
                        if created_at < now - timedelta(days=7):
                            very_old_notifications.append(notif_id)
                    except:
                        very_old_notifications.append(notif_id)
            
            # Rimuovi notifiche scadute dal file separato
            all_removed = expired_notifications + passed_event_notifications + very_old_notifications
            
            for notif_id in all_removed:
                if notif_id in self._notifications_data:
                    # Rimuove dai dati locali
                    del self._notifications_data[notif_id]
            
            # Salva il file aggiornato se sono state rimosse notifiche
            if all_removed:
                await self._save_notifications()
                _LOGGER.info(f"✅ Pulizia completata - Rimosse {len(all_removed)} notifiche obsolete")
                
                # Aggiorna Home Assistant
                self.async_write_ha_state()
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore durante pulizia notifiche: {e}")
            pass

    async def _migrate_existing_notifications(self) -> None:
        """Migra notifiche esistenti rimuovendo campi obsoleti."""
        try:
            migrated_count = 0
            
            for notif_id, notification in self._notifications_data.items():
                needs_migration = False
                
                # Rimuovi campi obsoleti "sent" e "sent_at" se presenti
                if "sent" in notification:
                    del notification["sent"]
                    needs_migration = True
                    
                if "sent_at" in notification:
                    del notification["sent_at"]
                    needs_migration = True
                
                if needs_migration:
                    migrated_count += 1
            
            if migrated_count > 0:
                # Non serve più salvare nel file separato - le modifiche sono solo in memoria
                # Forza pulizia immediata dopo migrazione
                await self._cleanup_expired_notifications()
                
        except Exception as e:
            pass

    @property
    def native_value(self) -> int:
        """Restituisce il numero di notifiche attive."""
        # I dati vengono caricati all'avvio e aggiornati dai servizi
        return len(self._notifications_data)

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Attributi aggiuntivi del sensore notifiche."""
        attrs = super().extra_state_attributes
        
        # Aggiungi tutte le notifiche come attributi
        notifications_list = []
        now = dt_util.utcnow()
        
        for notif_id, notification in self._notifications_data.items():
            try:
                event_start_str = notification['event_start'].replace('Z', '+00:00')
                event_start = datetime.fromisoformat(event_start_str)
                
                # Assicurati che event_start sia timezone-aware come now
                if event_start.tzinfo is None:
                    event_start = dt_util.as_utc(event_start)
                
                offset_minutes = notification['offset_minutes']
                notification_time = event_start - timedelta(minutes=offset_minutes)
                
                notif_info = {
                    'id': notif_id,
                    'event_id': notification.get('event_id', ''),
                    'event_summary': notification.get('event_summary', ''),
                    'event_start': notification['event_start'],
                    'notification_type': notification['notification_type'],
                    'offset_minutes': offset_minutes,
                    'target_device': notification.get('target_device', 'auto'),
                    'notification_time': notification_time.isoformat(),
                    'minutes_until_notification': int((notification_time - now).total_seconds() / 60),
                    'enabled': notification.get('enabled', True)
                }
                notifications_list.append(notif_info)
                
            except Exception as e:
                pass
        
        # Ordina per tempo di notifica
        notifications_list.sort(key=lambda x: x['notification_time'])
        
        # Aggiungi anche i dati degli eventi per accesso rapido dalla card
        events_data = {}
        notifications_data = {}
        
        try:
            # Fallback semplice: usa sempre i dati dal coordinator se disponibili
            if hasattr(self.coordinator, 'data') and self.coordinator.data:
                events_data = self.coordinator.data
            else:
                # Se il coordinator non ha dati, non fare niente di complesso
                events_data = {}
            
            # Prepara i dati delle notifiche in formato dizionario per la card
            for notif_id, notification in self._notifications_data.items():
                notifications_data[notif_id] = notification.copy()
                notifications_data[notif_id]['id'] = notif_id
                
        except Exception as e:
            _LOGGER.debug(f"Errore caricamento dati per attributes: {e}")
        
        attrs.update({
            'notifications': notifications_list,
            'active_count': len([n for n in notifications_list if n['enabled']]),
            'upcoming_count': len([n for n in notifications_list if n['minutes_until_notification'] > 0]),
            'file_path': self._notifications_file,
            # Aggiungi i dati grezzi per la card
            'events_data': events_data,
            'notifications_data': notifications_data
        })
        
        return attrs

    async def add_notification(self, event_id: str, event_summary: str, event_start: str, 
                        notification_type: str, offset_minutes: int, target_device: str = None,
                        custom_message_push: str = None, custom_message_alexa: str = None) -> str:
        """Aggiunge una nuova notifica al file separato."""
        try:
            # Resetta i secondi nell'orario di inizio evento
            event_start_dt = datetime.fromisoformat(event_start.replace('Z', '+00:00'))
            event_start_no_seconds = event_start_dt.replace(second=0, microsecond=0)
            event_start_clean = event_start_no_seconds.isoformat()
            
            # Genera ID univoco per la notifica
            notif_id = f"notif_{event_id}_{notification_type}_{offset_minutes}_{int(dt_util.utcnow().timestamp())}"
            
            # Aggiorna i dati locali
            self._notifications_data[notif_id] = {
                'event_id': event_id,
                'event_summary': event_summary,
                'event_start': event_start_clean,  # Usa l'orario senza secondi
                'notification_type': notification_type,
                'offset_minutes': offset_minutes,
                'target_device': target_device or 'auto',
                'custom_message_push': custom_message_push,
                'custom_message_alexa': custom_message_alexa,
                'created_at': dt_util.utcnow().replace(second=0, microsecond=0).isoformat(),
                'enabled': True
            }
            
            _LOGGER.info(f"➕ Aggiunta notifica per {event_summary} - Orario evento pulito: {event_start_clean}")
            
            # Salva nel file separato
            await self._save_notifications()
            
            return notif_id
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore aggiungendo notifica: {e}")
            raise e



    async def remove_notification(self, notification_id: str) -> bool:
        """Rimuove una notifica dal file separato."""
        try:
            if notification_id in self._notifications_data:
                # Rimuove dai dati locali
                del self._notifications_data[notification_id]
                
                # Salva nel file separato
                await self._save_notifications()
                
                return True
            else:
                return False
                
        except Exception as e:
            return False

    def get_notifications_for_event(self, event_id: str) -> List[Dict[str, Any]]:
        """Ottiene tutte le notifiche per un evento specifico."""
        notifications = []
        for notif_id, notification in self._notifications_data.items():
            if notification.get('event_id') == event_id:
                notif_copy = notification.copy()
                notif_copy['id'] = notif_id
                notifications.append(notif_copy)
        return notifications

    async def toggle_notification(self, notification_id: str) -> bool:
        """Attiva/disattiva una notifica."""
        try:
            if notification_id in self._notifications_data:
                current_state = self._notifications_data[notification_id].get('enabled', True)
                new_state = not current_state
                
                # Aggiorna i dati locali
                self._notifications_data[notification_id]['enabled'] = new_state
                
                # Salva nel file separato
                await self._save_notifications()
                
                return True
            else:
                return False
                
        except Exception as e:
            return False

    async def force_cleanup_notifications(self) -> int:
        """Forza la pulizia delle notifiche obsolete."""
        try:
            initial_count = len(self._notifications_data)
            await self._cleanup_expired_notifications()
            final_count = len(self._notifications_data)
            removed_count = initial_count - final_count
            
            _LOGGER.info(f"🧹 Pulizia forzata completata - Rimosse {removed_count} notifiche")
            return removed_count
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore durante pulizia forzata: {e}")
            return 0

    async def _start_notification_system(self) -> None:
        """Avvia il sistema di controllo notifiche."""
        if self._running:
            return
            
        self._running = True
        
        # Controlla ogni minuto per notifiche da inviare
        async def _check_wrapper(now):
            # Forza l'azzeramento dei secondi prima di chiamare _check_notifications
            now_clean = now.replace(second=0, microsecond=0)
            _LOGGER.debug(f"⏰ Check notifiche al minuto esatto: {now_clean.strftime('%H:%M:00')}")
            await self._check_notifications(now_clean)
        
        self._unsub_timer = async_track_time_interval(
            self.hass,
            _check_wrapper,
            timedelta(minutes=1)
        )
        
        # Pulizia automatica ogni 15 minuti
        self._unsub_cleanup_timer = async_track_time_interval(
            self.hass,
            self._periodic_cleanup,
            timedelta(minutes=15)
        )

    async def _stop_notification_system(self) -> None:
        """Ferma il sistema di controllo notifiche."""
        if not self._running:
            return
            
        self._running = False
        
        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None
            
        if self._unsub_cleanup_timer:
            self._unsub_cleanup_timer()
            self._unsub_cleanup_timer = None

    async def async_will_remove_from_hass(self) -> None:
        """Chiamato quando il sensore viene rimosso."""
        await self._stop_notification_system()
        await super().async_will_remove_from_hass()

    async def _check_notifications(self, now: datetime = None) -> None:
        """Controlla se ci sono notifiche da inviare."""
        if not self._running:
            return
            
        now = now or dt_util.now()
        # Azzera i secondi per confrontare solo ore e minuti
        now_truncated = now.replace(second=0, microsecond=0)
        notifications_to_send = []
        
        _LOGGER.debug(f"🔍 Controllo notifiche - Ora corrente (HH:MM): {now_truncated.strftime('%H:%M')}")
        
        for notif_id, notification in self._notifications_data.items():
            if notification.get("enabled", True):
                
                # Calcola il momento dell'invio
                try:
                    # Converti e pulisci l'orario di inizio evento
                    event_start_str = notification["event_start"].replace('Z', '+00:00')
                    event_start = datetime.fromisoformat(event_start_str)
                    
                    # Assicurati che event_start sia timezone-aware come now
                    if event_start.tzinfo is None:
                        event_start = dt_util.as_utc(event_start)
                    
                    event_start_clean = event_start.replace(second=0, microsecond=0)
                    
                    # Calcola il momento della notifica e puliscilo
                    offset_minutes = notification["offset_minutes"]
                    notification_time = event_start_clean - timedelta(minutes=offset_minutes)
                    notification_time_clean = notification_time.replace(second=0, microsecond=0)
                    
                    _LOGGER.debug(f"📅 Notifica {notification.get('event_summary')} - Orario notifica (HH:MM): {notification_time_clean.strftime('%H:%M')}")
                    
                    # Controlla se è il momento esatto (solo ore e minuti)
                    if now_truncated == notification_time_clean:
                        notifications_to_send.append((notif_id, notification))
                        _LOGGER.info(f"🎯 Notifica pronta: {notification.get('event_summary')} - Ora: {now_truncated.strftime('%H:%M')}")
                        
                except Exception as e:
                    _LOGGER.warning(f"⚠️ Errore parsing notifica {notif_id}: {e}")
        
        # Invia le notifiche
        for notif_id, notification in notifications_to_send:
            await self._send_notification(notif_id, notification)

    async def _periodic_cleanup(self, now: datetime = None) -> None:
        """Pulizia periodica delle notifiche obsolete."""
        if not self._running:
            return
            
        try:
            await self._cleanup_expired_notifications()
        except Exception as e:
            _LOGGER.warning(f"⚠️ Errore durante pulizia periodica notifiche: {e}")

    async def _send_notification(self, notif_id: str, notification: Dict[str, Any]) -> None:
        """Invia una notifica."""
        try:
            _LOGGER.info(f"🚀 Invio notifica {notif_id} per evento '{notification.get('event_summary')}'")
            
            notification_type = notification.get("notification_type")
            event_summary = notification.get("event_summary")
            event_start = notification.get("event_start")
            target_device = notification.get("target_device", "auto")
            offset_minutes = notification.get("offset_minutes")
            custom_message_push = notification.get("custom_message_push")
            custom_message_alexa = notification.get("custom_message_alexa")
            
            # Prepara le variabili per i messaggi personalizzati
            offset_desc = self._get_offset_description(offset_minutes)
            event_time = datetime.fromisoformat(event_start.replace('Z', '+00:00')).strftime("%H:%M")
            event_date = datetime.fromisoformat(event_start.replace('Z', '+00:00')).strftime("%d/%m/%Y")
            
            if notification_type == "push":
                # Messaggio personalizzato per Push o default
                if custom_message_push:
                    message = custom_message_push.format(
                        event_summary=event_summary,
                        offset_desc=offset_desc,
                        event_time=event_time,
                        event_date=event_date
                    )
                else:
                    message = f"📅 Promemoria: '{event_summary}' inizia {offset_desc} (alle {event_time})"
                    
                await self._send_push_notification(message, target_device)
                _LOGGER.info(f"✅ Notifica Push inviata per {event_summary}")
                
            elif notification_type == "alexa":
                # Messaggio personalizzato per Alexa o default
                if custom_message_alexa:
                    message = custom_message_alexa.format(
                        event_summary=event_summary,
                        offset_desc=offset_desc,
                        event_time=event_time,
                        event_date=event_date
                    )
                else:
                    message = f"Attenzione! L'evento '{event_summary}' inizia {offset_desc}, alle ore {event_time}"
                    
                await self._send_alexa_notification(message, target_device)
                _LOGGER.info(f"🔊 Notifica Alexa inviata per {event_summary}")
            
            # Rimuovi la notifica dopo l'invio dal file separato
            if notif_id in self._notifications_data:
                _LOGGER.info(f"🗑️ Rimuovo notifica {notif_id} dopo l'invio")
                
                # Rimuove dai dati locali
                del self._notifications_data[notif_id]
                
                # Salva il file separato aggiornato
                await self._save_notifications()
                
                _LOGGER.info(f"✅ Notifica {notif_id} rimossa con successo")
            else:
                _LOGGER.warning(f"⚠️ Notifica {notif_id} non trovata nei dati locali")
            
            # Aggiorna Home Assistant
            self.async_write_ha_state()
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore inviando notifica {notif_id}: {e}")
            pass

    async def _send_push_notification(self, message: str, target_device: str = "auto") -> None:
        """Invia una notifica push semplice."""
        try:
            service_data = {
                "message": message,
                "title": "📅 Better Calendar"
            }
            
            if target_device and target_device != "auto":
                # Estrai il nome del servizio se formato come notify.service_name
                if target_device.startswith("notify."):
                    service_name = target_device.replace("notify.", "")
                else:
                    service_name = target_device
                    
                # Verifica che il servizio esista
                if not self.hass.services.has_service("notify", service_name):
                    _LOGGER.error(f"❌ Servizio notify.{service_name} non disponibile per notifica push!")
                    return
                    
                _LOGGER.info(f"📱 Invio notifica push a servizio: notify.{service_name}")
                await self.hass.services.async_call(
                    "notify", service_name, service_data
                )
            else:
                # Notifica generale
                _LOGGER.info(f"📱 Invio notifica push generale")
                await self.hass.services.async_call(
                    "notify", "notify", service_data
                )
                
            _LOGGER.info(f"✅ Notifica push inviata con successo")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore inviando notifica push: {e}")
            _LOGGER.error(f"❌ Tipo errore: {type(e).__name__}")
            _LOGGER.error(f"❌ Target device: {target_device}")

    async def _send_alexa_notification(self, message: str, target_device: str = "auto") -> None:
        """Invia una notifica Alexa."""
        try:
            # Se il target_device è specificato e inizia con "notify.", usa quello
            if target_device and target_device != "auto":
                # Determina il tipo di chiamata basato sul target_device PRIMA del controllo servizio
                if target_device.endswith(('_speak', '_announce')):
                    # Entità notify (speak/announce) - usa direttamente send_message con entity_id
                    service_data = {
                        "message": message,
                        "entity_id": target_device
                    }
                    
                    _LOGGER.info(f"🔊 Invio notifica Alexa tramite send_message: {target_device}")
                    await self.hass.services.async_call(
                        "notify", "send_message", service_data
                    )
                    
                    _LOGGER.info(f"✅ Notifica Alexa inviata con successo tramite {target_device}")
                    return  # Esci subito senza altri controlli
                
                # Per altri tipi di target, procedi con la logica normale
                if target_device.startswith("notify."):
                    # Estrai il nome del servizio (rimuovi "notify.")
                    alexa_service = target_device.replace("notify.", "")
                else:
                    alexa_service = target_device
                
                # Verifica che il servizio esista (solo per servizi non speak/announce)
                if not self.hass.services.has_service("notify", alexa_service):
                    _LOGGER.warning(f"⚠️ Servizio {target_device} non disponibile!")
                    
                    # Prova a cercare servizi simili
                    available_services = list(self.hass.services.async_services().get("notify", {}).keys())
                    _LOGGER.info(f"📋 Servizi notify disponibili: {available_services}")
                    
                    # Cerca servizi alexa alternativi
                    alexa_alternatives = [s for s in available_services if 'alexa' in s.lower() or 'speak' in s.lower() or 'announce' in s.lower()]
                    if alexa_alternatives:
                        alexa_service = alexa_alternatives[0]
                        _LOGGER.info(f"🔄 Uso servizio alternativo: notify.{alexa_service}")
                    else:
                        _LOGGER.error(f"❌ Nessun servizio Alexa alternativo trovato!")
                        return
                
                # Gestisci servizi alexa_media tradizionali
                if alexa_service == "alexa_media":
                    # Servizio alexa_media tradizionale - estrai il media_player dal target_device
                    # Il target_device dovrebbe essere nel formato: notify.alexa_media oppure media_player.xxx
                    media_player_target = target_device
                    if target_device.startswith("notify."):
                        # Se è notify.alexa_media, usa un media_player di default o cerca il primo disponibile
                        media_players = [entity for entity in self.hass.states.async_all() 
                                       if entity.entity_id.startswith("media_player.") and "alexa" in entity.entity_id.lower()]
                        if media_players:
                            media_player_target = media_players[0].entity_id
                        else:
                            media_player_target = "media_player.sala"  # fallback
                    
                    service_data = {
                        "message": message,
                        "target": media_player_target,
                        "data": {
                            "type": "announce"
                        }
                    }
                    
                    _LOGGER.info(f"🔊 Invio notifica Alexa tramite alexa_media: {media_player_target}")
                    await self.hass.services.async_call(
                        "notify", "alexa_media", service_data
                    )
                    
                else:
                    # Fallback al formato tradizionale per altri servizi notify
                    service_data = {
                        "message": message
                    }
                    
                    _LOGGER.info(f"🔊 Invio notifica tramite servizio notify: {target_device}")
                    await self.hass.services.async_call(
                        "notify", alexa_service, service_data
                    )
                    
                _LOGGER.info(f"✅ Notifica Alexa inviata con successo tramite {target_device}")
                    
            else:
                # Solo se non è specificato, cerca automaticamente
                alexa_services = []
                for service_name in self.hass.services.async_services().get("notify", {}):
                    if "alexa_media" in service_name:
                        alexa_services.append(service_name)
                
                if not alexa_services:
                    _LOGGER.error("❌ Nessun servizio Alexa trovato!")
                    return
                
                alexa_service = alexa_services[0]
                _LOGGER.info(f"🔊 Invio notifica Alexa tramite primo servizio trovato: notify.{alexa_service}")
            
                service_data = {
                    "message": message,
                    "data": {
                        "type": "announce"
                    }
                }
                
                await self.hass.services.async_call(
                    "notify", alexa_service, service_data
                )
                
                _LOGGER.info(f"✅ Notifica Alexa inviata con successo tramite notify.{alexa_service}")
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore inviando notifica Alexa: {e}")
            _LOGGER.error(f"❌ Tipo errore: {type(e).__name__}")
            _LOGGER.error(f"❌ Messaggio: {message}")
            _LOGGER.error(f"❌ Target device: {target_device}")

    def _get_offset_description(self, minutes: int) -> str:
        """Converte i minuti in descrizione leggibile."""
        if minutes >= 43200:  # 30 giorni
            return 'tra 1 mese'
        elif minutes >= 21600:  # 15 giorni
            return 'tra 15 giorni'
        elif minutes >= 14400:  # 10 giorni
            return 'tra 10 giorni'
        elif minutes >= 10080:  # 7 giorni
            return 'tra 1 settimana'
        elif minutes >= 7200:   # 5 giorni
            return 'tra 5 giorni'
        elif minutes >= 2880:   # 2 giorni
            return 'tra 2 giorni'
        elif minutes >= 1440:   # 1 giorno
            return 'tra 1 giorno'
        elif minutes >= 60:     # 1+ ore
            hours = minutes // 60
            remaining_minutes = minutes % 60
            if remaining_minutes == 0:
                return f'tra {hours} {"ora" if hours == 1 else "ore"}'
            else:
                return f'tra {hours}h {remaining_minutes}m'
        else:  # < 1 ora
            return f'tra {minutes} minuti'