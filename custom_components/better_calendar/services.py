"""Servizi per Better Calendar."""
import logging
from typing import Any, Dict
from datetime import datetime, timedelta

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
import voluptuous as vol

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Schema dei servizi
FORCE_UPDATE_SCHEMA = vol.Schema({})

CREATE_EVENT_SCHEMA = vol.Schema({
    vol.Required("summary"): cv.string,
    vol.Optional("description", default=""): cv.string,
    vol.Required("start_datetime"): cv.string,
    vol.Required("end_datetime"): cv.string,
    vol.Optional("all_day", default=False): cv.boolean,
    vol.Optional("has_notification", default=False): cv.boolean,
    vol.Optional("notification_time"): cv.positive_int,
})

UPDATE_EVENT_SCHEMA = vol.Schema({
    vol.Required("event_id"): cv.string,
    vol.Required("summary"): cv.string,
    vol.Optional("description", default=""): cv.string,
    vol.Required("start_datetime"): cv.string,
    vol.Required("end_datetime"): cv.string,
    vol.Optional("all_day", default=False): cv.boolean,
    vol.Optional("has_notification", default=False): cv.boolean,
    vol.Optional("notification_time"): cv.positive_int,
})

DELETE_EVENT_SCHEMA = vol.Schema({
    vol.Required("event_id"): cv.string,
})

ADD_NOTIFICATION_SCHEMA = vol.Schema({
    vol.Required("event_id"): cv.string,
    vol.Required("event_summary"): cv.string,
    vol.Required("event_start"): cv.string,
    vol.Required("notification_type"): vol.In(["push", "alexa"]),
    vol.Required("offset_minutes"): cv.positive_int,
    vol.Optional("target_device"): cv.string,
    vol.Optional("custom_message_push"): cv.string,
    vol.Optional("custom_message_alexa"): cv.string,
})

REMOVE_NOTIFICATION_SCHEMA = vol.Schema({
    vol.Required("notification_id"): cv.string,
})

TOGGLE_NOTIFICATION_SCHEMA = vol.Schema({
    vol.Required("notification_id"): cv.string,
})

# Schema per azioni interattive delle notifiche
SNOOZE_EVENT_SCHEMA = vol.Schema({
    vol.Required("event_id"): cv.string,
    vol.Required("minutes"): cv.positive_int,
})

MARK_EVENT_DONE_SCHEMA = vol.Schema({
    vol.Required("event_id"): cv.string,
})

HANDLE_NOTIFICATION_ACTION_SCHEMA = vol.Schema({
    vol.Required("action"): cv.string,
    vol.Required("event_id"): cv.string,
})

SYNC_FILES_SCHEMA = vol.Schema({})



async def async_setup_services(hass: HomeAssistant) -> None:
    """Registra i servizi per Better Calendar."""
    
    def _get_coordinator():
        """Ottiene il primo coordinator disponibile."""
        for entry_id, entry_data in hass.data.get(DOMAIN, {}).items():
            if isinstance(entry_data, dict) and "coordinator" in entry_data:
                return entry_data["coordinator"]
        return None
    
    def _get_notifications_sensor():
        """Ottiene il sensore delle notifiche."""
        try:
            # Cerca il sensore delle notifiche nei dati del domain
            for entry_id, entry_data in hass.data.get(DOMAIN, {}).items():
                if isinstance(entry_data, dict) and "notifications_sensor" in entry_data:
                    return entry_data["notifications_sensor"]
                        
            return None
            
        except Exception as e:
            _LOGGER.error(f"Errore nel trovare il sensore notifiche: {e}")
            return None
    
    async def force_update_calendars(call: ServiceCall) -> None:
        """Forza l'aggiornamento immediato di tutti i calendari."""

        
        # Trova tutte le istanze del coordinator
        coordinators = []
        for entry_id, entry_data in hass.data.get(DOMAIN, {}).items():
            if isinstance(entry_data, dict) and "coordinator" in entry_data:
                coordinators.append(entry_data["coordinator"])
        
        if not coordinators:
            _LOGGER.warning("⚠️ Nessun coordinator trovato per l'aggiornamento")
            return
        
        # Forza l'aggiornamento di tutti i coordinatori
        for coordinator in coordinators:
            try:
                await coordinator.async_refresh()
            except Exception as e:
                _LOGGER.error(f"❌ Errore aggiornando coordinator {coordinator.name}: {e}")
        


    async def create_event(call: ServiceCall) -> None:
        """Crea un nuovo evento."""
        coordinator = _get_coordinator()
        if not coordinator:
            _LOGGER.error("❌ Nessun coordinator trovato")
            return
            
        try:
            event_data = {
                "summary": call.data["summary"],
                "description": call.data.get("description", ""),
                "start_datetime": call.data["start_datetime"],
                "end_datetime": call.data["end_datetime"],
                "all_day": call.data.get("all_day", False),
                "has_notification": call.data.get("has_notification", False),
                "notification_time": call.data.get("notification_time")
            }
            
            event_id = await coordinator.create_event(event_data)
            
            # Invia evento di conferma
            hass.bus.async_fire(f"{DOMAIN}_event_created", {
                "event_id": event_id,
                "summary": event_data["summary"]
            })
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore creando evento: {e}")

    async def update_event(call: ServiceCall) -> None:
        """Aggiorna un evento esistente."""
        coordinator = _get_coordinator()
        if not coordinator:
            _LOGGER.error("❌ Nessun coordinator trovato")
            return
            
        try:
            event_data = {
                "event_id": call.data["event_id"],
                "summary": call.data["summary"],
                "description": call.data.get("description", ""),
                "start_datetime": call.data["start_datetime"],
                "end_datetime": call.data["end_datetime"],
                "all_day": call.data.get("all_day", False),
                "has_notification": call.data.get("has_notification", False),
                "notification_time": call.data.get("notification_time")
            }
            
            success = await coordinator.update_event(event_data)
            
            if success:
                hass.bus.async_fire(f"{DOMAIN}_event_updated", {
                    "event_id": call.data["event_id"],
                    "summary": event_data["summary"]
                })
            else:
                _LOGGER.warning(f"⚠️ Evento non trovato: {call.data['event_id']}")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore aggiornando evento: {e}")

    async def delete_event(call: ServiceCall) -> None:
        """Elimina un evento."""
        coordinator = _get_coordinator()
        if not coordinator:
            _LOGGER.error("❌ Nessun coordinator trovato")
            return
            
        try:
            success = await coordinator.delete_event(call.data["event_id"])
            
            if success:
                hass.bus.async_fire(f"{DOMAIN}_event_deleted", {
                    "event_id": call.data["event_id"]
                })
            else:
                _LOGGER.warning(f"⚠️ Evento non trovato: {call.data['event_id']}")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore eliminando evento: {e}")

    async def add_notification(call: ServiceCall) -> None:
        """Aggiunge una notifica per un evento."""
        notifications_sensor = _get_notifications_sensor()
        if not notifications_sensor:
            raise ServiceValidationError(f"Sensore notifiche non trovato")
            
        try:
            notification_id = await notifications_sensor.add_notification(
                event_id=call.data["event_id"],
                event_summary=call.data["event_summary"],
                event_start=call.data["event_start"],
                notification_type=call.data["notification_type"],
                offset_minutes=call.data["offset_minutes"],
                target_device=call.data.get("target_device"),
                custom_message_push=call.data.get("custom_message_push"),
                custom_message_alexa=call.data.get("custom_message_alexa")
            )
            

            
            # Invia evento di conferma
            hass.bus.async_fire(f"{DOMAIN}_notification_added", {
                "notification_id": notification_id,
                "event_id": call.data["event_id"],
                "notification_type": call.data["notification_type"]
            })
            
            # Forza l'aggiornamento del sensore (se possibile)
            if hasattr(notifications_sensor, 'async_write_ha_state'):
                notifications_sensor.async_write_ha_state()
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore aggiungendo notifica: {e}")

    async def remove_notification(call: ServiceCall) -> None:
        """Rimuove una notifica."""
        notifications_sensor = _get_notifications_sensor()
        if not notifications_sensor:
            _LOGGER.error("❌ Sensore notifiche non trovato")
            return
            
        try:
            success = await notifications_sensor.remove_notification(call.data["notification_id"])
            
            if success:
                hass.bus.async_fire(f"{DOMAIN}_notification_removed", {
                    "notification_id": call.data["notification_id"]
                })
                
                # Forza l'aggiornamento del sensore (se possibile)
                if hasattr(notifications_sensor, 'async_write_ha_state'):
                    notifications_sensor.async_write_ha_state()
            else:
                _LOGGER.warning(f"⚠️ Notifica non trovata: {call.data['notification_id']}")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore rimuovendo notifica: {e}")

    async def toggle_notification(call: ServiceCall) -> None:
        """Attiva/disattiva una notifica."""
        notifications_sensor = _get_notifications_sensor()
        if not notifications_sensor:
            _LOGGER.error("❌ Sensore notifiche non trovato")
            return
            
        try:
            success = await notifications_sensor.toggle_notification(call.data["notification_id"])
            
            if success:
                hass.bus.async_fire(f"{DOMAIN}_notification_toggled", {
                    "notification_id": call.data["notification_id"]
                })
                
                # Forza l'aggiornamento del sensore (se possibile)
                if hasattr(notifications_sensor, 'async_write_ha_state'):
                    notifications_sensor.async_write_ha_state()
            else:
                _LOGGER.warning(f"⚠️ Notifica non trovata: {call.data['notification_id']}")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore toggling notifica: {e}")

    async def debug_calendar_sync(hass: HomeAssistant, call: ServiceCall) -> None:
        """Servizio di debug per testare la sincronizzazione di un calendario specifico."""
        entity_id = call.data.get("entity_id", "calendar.lore_tavola_gmail_com")
        
        # Controlla se l'entità esiste
        if entity_id not in hass.states.async_entity_ids():
            _LOGGER.error(f"❌ Calendario {entity_id} non trovato in HA")
            return
        
        # Ottieni lo stato del calendario
        state = hass.states.get(entity_id)
        
        # Testa il servizio get_events
        from datetime import datetime, timedelta
        now = datetime.now()
        start_date = now.date() - timedelta(days=30)
        end_date = now.date() + timedelta(days=120)
        
        try:
            response = await hass.services.async_call(
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
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore nel test: {e}")
            import traceback
            _LOGGER.error(f"❌ Traceback: {traceback.format_exc()}")

    async def sync_files(call: ServiceCall) -> None:
        """Servizio legacy - non più necessario con get_files_data."""
        _LOGGER.info("ℹ️ Il servizio sync_files è deprecato - i file rimangono solo nella cartella del custom component")
        
        # Invia evento per compatibilità
        hass.bus.async_fire(f"{DOMAIN}_files_synced", {
            "message": "Sincronizzazione non necessaria - file già nella cartella del componente",
            "timestamp": datetime.now().isoformat()
        })

    async def snooze_event(call: ServiceCall) -> None:
        """Posticipa un evento di X minuti aggiungendo una nuova notifica."""
        coordinator = _get_coordinator()
        notifications_sensor = _get_notifications_sensor()
        
        if not coordinator or not notifications_sensor:
            _LOGGER.error("❌ Coordinator o sensore notifiche non trovato")
            return
            
        try:
            event_id = call.data["event_id"]
            snooze_minutes = call.data["minutes"]
            
            # Trova l'evento
            events = await coordinator.async_get_events(
                datetime.now(),
                datetime.now() + timedelta(days=30)
            )
            
            event = None
            for evt in events:
                if evt.get("id") == event_id:
                    event = evt
                    break
            
            if not event:
                _LOGGER.error(f"❌ Evento {event_id} non trovato")
                return
            
            # Crea una nuova notifica posticipata
            event_start = event.get("start")
            if isinstance(event_start, dict):
                start_time = event_start.get("dateTime") or event_start.get("date")
            else:
                start_time = event_start
            
            # Aggiungi nuova notifica con offset ridotto
            await notifications_sensor.add_notification(
                event_id=event_id,
                event_summary=event.get("summary", ""),
                event_start=start_time,
                notification_type="push",
                offset_minutes=snooze_minutes,
                target_device="auto",
                custom_message_push=f"⏰ Promemoria posticipato: '{event.get('summary')}' inizia tra {snooze_minutes} minuti"
            )
            
            _LOGGER.info(f"✅ Evento posticipato di {snooze_minutes} minuti")
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore posticipando evento: {e}")

    async def mark_event_done(call: ServiceCall) -> None:
        """Marca un evento come completato."""
        try:
            event_id = call.data["event_id"]
            
            # Invia evento per notificare che l'evento è stato marcato come fatto
            hass.bus.async_fire(f"{DOMAIN}_event_marked_done", {
                "event_id": event_id,
                "timestamp": datetime.now().isoformat()
            })
            
            _LOGGER.info(f"✅ Evento {event_id} marcato come completato")
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore marcando evento come fatto: {e}")

    async def handle_notification_action(call: ServiceCall) -> None:
        """Gestisce le azioni dalle notifiche interattive."""
        try:
            action = call.data["action"]
            event_id = call.data["event_id"]
            
            if action.startswith("snooze_"):
                minutes = int(action.split("_")[1])
                await snooze_event(ServiceCall(
                    domain=DOMAIN,
                    service="snooze_event",
                    data={"event_id": event_id, "minutes": minutes}
                ))
                
            elif action.startswith("delete_"):
                coordinator = _get_coordinator()
                if coordinator:
                    await coordinator.delete_event(event_id)
                    _LOGGER.info(f"✅ Evento {event_id} eliminato da azione notifica")
                    
            elif action.startswith("mark_done_"):
                await mark_event_done(ServiceCall(
                    domain=DOMAIN,
                    service="mark_event_done",
                    data={"event_id": event_id}
                ))
                
            _LOGGER.info(f"✅ Azione {action} eseguita per evento {event_id}")
            
        except Exception as e:
            _LOGGER.error(f"❌ Errore gestendo azione notifica: {e}")


    # Registra i servizi
    hass.services.async_register(
        DOMAIN,
        "force_update_calendars",
        force_update_calendars,
        schema=FORCE_UPDATE_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "create_event",
        create_event,
        schema=CREATE_EVENT_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "update_event",
        update_event,
        schema=UPDATE_EVENT_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "delete_event",
        delete_event,
        schema=DELETE_EVENT_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "add_notification",
        add_notification,
        schema=ADD_NOTIFICATION_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "remove_notification",
        remove_notification,
        schema=REMOVE_NOTIFICATION_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "toggle_notification",
        toggle_notification,
        schema=TOGGLE_NOTIFICATION_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "debug_calendar_sync",
        debug_calendar_sync,
        schema=vol.Schema({
            vol.Optional("entity_id", default="calendar.lore_tavola_gmail_com"): cv.string,
        }),
    )
    
    hass.services.async_register(
        DOMAIN,
        "sync_files",
        sync_files,
        schema=SYNC_FILES_SCHEMA,
    )
    
    # Servizi per azioni interattive notifiche
    hass.services.async_register(
        DOMAIN,
        "snooze_event",
        snooze_event,
        schema=SNOOZE_EVENT_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "mark_event_done",
        mark_event_done,
        schema=MARK_EVENT_DONE_SCHEMA,
    )
    
    hass.services.async_register(
        DOMAIN,
        "handle_notification_action",
        handle_notification_action,
        schema=HANDLE_NOTIFICATION_ACTION_SCHEMA,
    )
    

    



async def async_unload_services(hass: HomeAssistant) -> None:
    """Rimuove i servizi Better Calendar."""
    hass.services.async_remove(DOMAIN, "force_update_calendars")
    hass.services.async_remove(DOMAIN, "create_event")
    hass.services.async_remove(DOMAIN, "update_event")
    hass.services.async_remove(DOMAIN, "delete_event")
    hass.services.async_remove(DOMAIN, "add_notification")
    hass.services.async_remove(DOMAIN, "remove_notification")
    hass.services.async_remove(DOMAIN, "toggle_notification")
    hass.services.async_remove(DOMAIN, "debug_calendar_sync")
    hass.services.async_remove(DOMAIN, "sync_files")

 