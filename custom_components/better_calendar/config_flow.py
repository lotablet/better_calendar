"""Config flow per Better Calendar."""
import logging
from typing import Any, Dict, Optional

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN, 
    COMPONENT_NAME,
)

_LOGGER = logging.getLogger(__name__)


class BetterCalendarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Gestisce il config flow per Better Calendar."""

    VERSION = 1

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Gestisce il passo iniziale di configurazione."""
        if user_input is not None:
            # Controlla se l'integrazione è già configurata
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()

            # Crea direttamente l'entry con tutti i dati
            return self.async_create_entry(
                title=COMPONENT_NAME,
                data=user_input,
            )

        # Ottieni tutti i calendari disponibili
        available_calendars = self._get_available_calendars()
        
        if not available_calendars:
            return self.async_abort(reason="no_calendars_found")

        # Schema di configurazione completo (come nell'options flow)
        data_schema = vol.Schema({
            vol.Required(
                "selected_calendars",
                default=list(available_calendars.keys())
            ): cv.multi_select(available_calendars),
            vol.Optional(
                "update_interval", 
                default=5
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=60)),
        })

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            description_placeholders={
                "name": COMPONENT_NAME,
                "calendars_count": len(available_calendars),
            },
        )

    def _get_available_calendars(self) -> Dict[str, str]:
        """Ottieni la lista dei calendari disponibili."""
        available_calendars = {}
        
        # Cerca tutte le entità calendario in Home Assistant
        for entity_id in self.hass.states.async_entity_ids("calendar"):
            state = self.hass.states.get(entity_id)
            if state:
                friendly_name = state.attributes.get("friendly_name", entity_id)
                available_calendars[entity_id] = friendly_name
                
        return available_calendars

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> "BetterCalendarOptionsFlowHandler":
        """Restituisce il gestore del flusso opzioni."""
        return BetterCalendarOptionsFlowHandler(config_entry)


class BetterCalendarOptionsFlowHandler(config_entries.OptionsFlow):
    """Gestisce il flusso delle opzioni per Better Calendar."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Inizializza il gestore delle opzioni."""
        # Fix deprecation warning - non impostare config_entry direttamente
        super().__init__()

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Gestisce il passo iniziale delle opzioni."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        # Ottieni la configurazione corrente usando il metodo moderno
        current_config = self._config_entry.data
        available_calendars = self._get_available_calendars()

        # Schema per le opzioni
        data_schema = vol.Schema({
            vol.Required(
                "selected_calendars",
                default=current_config.get("selected_calendars", list(available_calendars.keys()))
            ): cv.multi_select(available_calendars),
            vol.Optional(
                "update_interval",
                default=current_config.get("update_interval", 5)
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=60)),
        })

        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
            description_placeholders={
                "calendars_count": len(available_calendars),
            },
        )

    def _get_available_calendars(self) -> Dict[str, str]:
        """Ottieni la lista dei calendari disponibili."""
        available_calendars = {}
        
        # Cerca tutte le entità calendario in Home Assistant
        for entity_id in self.hass.states.async_entity_ids("calendar"):
            state = self.hass.states.get(entity_id)
            if state:
                friendly_name = state.attributes.get("friendly_name", entity_id)
                available_calendars[entity_id] = friendly_name
                
        return available_calendars 