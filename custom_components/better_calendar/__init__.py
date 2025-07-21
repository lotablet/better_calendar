"""Better Calendar integration for Home Assistant."""
import logging
import asyncio
from pathlib import Path
from typing import Any, Dict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform, EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import HomeAssistant, Event
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .coordinator import BetterCalendarCoordinator
from .services import async_setup_services, async_unload_services
from . import utils

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def _register_lovelace_card_if_exists(hass: HomeAssistant) -> None:
    """Registra automaticamente la card Lovelace se il file esiste."""
    
    try:
        # 1. Serve lovelace card
        path = Path(__file__).parent / "www"
        
        # Controlla se il file della card esiste
        if not (path / "better-calendar-card.js").exists():
            return
            
        utils.register_static_path(
            hass.http.app,
            "/better_calendar/www/better-calendar-card.js",
            path / "better-calendar-card.js",
        )
        
        # 2. Add card to resources
        version = getattr(hass.data["integrations"][DOMAIN], "version", 0)
        await utils.init_resource(
            hass, "/better_calendar/www/better-calendar-card.js", str(version)
        )
        
        _LOGGER.info(f"Better Calendar card registrata: /better_calendar/www/better-calendar-card.js")
            
    except Exception as e:
        _LOGGER.error(f"Errore registrazione risorsa Lovelace: {e}")


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Imposta il componente Better Calendar."""
    hass.data.setdefault(DOMAIN, {})
    
    # Registra automaticamente la card Lovelace se esiste
    await _register_lovelace_card_if_exists(hass)
    
    # Aggiungi listener per ricarica automatica dopo riavvio HA
    async def _handle_ha_started(event: Event) -> None:
        """Gestisce l'evento di avvio completo di Home Assistant."""
        _LOGGER.info("🚀 Home Assistant avviato, programmando ricarica Better Calendar in 15 secondi...")
        
        # Aspetta 15 secondi e poi ricarica tutti i coordinator
        await asyncio.sleep(15)
        
        try:
            # Trova tutti i coordinator attivi
            coordinators = []
            for entry_id, entry_data in hass.data.get(DOMAIN, {}).items():
                if isinstance(entry_data, dict) and "coordinator" in entry_data:
                    coordinators.append(entry_data["coordinator"])
            
            if coordinators:
                _LOGGER.info(f"🔄 Ricaricando {len(coordinators)} coordinator Better Calendar...")
                
                # Ricarica tutti i coordinator
                for coordinator in coordinators:
                    try:
                        await coordinator.async_refresh()
                        _LOGGER.info(f"✅ Coordinator {coordinator.name} ricaricato con successo")
                    except Exception as e:
                        _LOGGER.error(f"❌ Errore ricaricando coordinator {coordinator.name}: {e}")
                
                _LOGGER.info("🎉 Ricarica automatica Better Calendar completata!")
            else:
                _LOGGER.warning("⚠️ Nessun coordinator Better Calendar trovato per la ricarica")
                
        except Exception as e:
            _LOGGER.error(f"❌ Errore durante ricarica automatica Better Calendar: {e}")
    
    # Registra il listener per l'evento di avvio
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _handle_ha_started)
    
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Better Calendar from a config entry."""
    
    # Crea il coordinator
    coordinator = BetterCalendarCoordinator(hass, entry)
    
    # Setup del coordinator (avvia sistema notifiche)
    await coordinator.async_setup()
    
    # Primo aggiornamento dati
    await coordinator.async_config_entry_first_refresh()
    
    # Salva il coordinator nei dati dell'integrazione
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "config": entry.data,
    }
    
    # Setup delle piattaforme
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Setup dei servizi (solo la prima volta)
    if len(hass.data[DOMAIN]) == 1:
        await async_setup_services(hass)
    
    return True


async def async_update_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Gestisce l'aggiornamento della configurazione."""
    
    # Ottieni il coordinator
    entry_data = hass.data[DOMAIN].get(entry.entry_id, {})
    coordinator = entry_data.get("coordinator")
    
    if coordinator:
        # Chiama il metodo di aggiornamento del coordinator
        await coordinator.async_config_entry_updated(hass, entry)
        
        # Aggiorna la configurazione locale
        hass.data[DOMAIN][entry.entry_id]["config"] = entry.data
        
    else:
        _LOGGER.error(f"Coordinator non trovato per l'aggiornamento: {entry.entry_id}")


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    
    # Unload delle piattaforme
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    
    if unload_ok:
        # Cleanup del coordinator
        entry_data = hass.data[DOMAIN].get(entry.entry_id, {})
        coordinator = entry_data.get("coordinator")
        
        if coordinator:
            await coordinator.async_unload()
        
        # Rimuovi dai dati
        hass.data[DOMAIN].pop(entry.entry_id, None)
        
        # Rimuovi i servizi se non ci sono più istanze
        if not hass.data[DOMAIN]:
            await async_unload_services(hass)
            hass.data.pop(DOMAIN, None)
    return unload_ok 