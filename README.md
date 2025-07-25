[<img width="200" height="100" alt="banner_better-white" src="https://assets.production.linktr.ee/profiles/_next/static/logo-assets/default-meta-image.png"/>](https://linktr.ee/lotablet)  

<img width="396" height="108" alt="banner_better-white" src="https://github.com/user-attachments/assets/ff45046c-bb83-4a6e-a144-b26f6ffb9d56"/>

A complete custom component for Home Assistant — a controller for `calendar` entities that includes an advanced calendar backend and integrated frontend card with support for push notifications and Alexa.

## GUIDA IN [ITALIANO](https://github.com/lotablet/better_calendar/blob/main/README_IT.md)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=lotablet&repository=better_calendar&category=Integration)

## 🌟 Features

- **🧩 Full Custom Component**: Integrated backend for advanced calendar management  
- **📅 Integrated Frontend Card**: Modern calendar UI included in the component  
- **📱 Push Notifications**: Mobile notification support with customizable timing  
- **🔊 Alexa Notifications**: Integration with Amazon Echo devices  
- **✏️ Event Management**: Full event creation, editing, and deletion  
- **🎨 Multiple Themes**: Dark, Light, Google Dark, Google Light  
- **📱 Responsive**: Optimized for desktop and mobile  
- **🌍 Multilingual**: Supports Italian and English  
- **⏰ Flexible Timing**: Customizable notifications from minutes to weeks in advance  
- **🔄 Sync**: Google Calendar and local calendar support  
- **💾 Local Storage**: Notification and event management via local JSON files  

## 📦 Installation

### Method 1: HACS (Recommended)

1. Open HACS in Home Assistant  
2. Go to **"Custom Repositories"** via the top right menu  
3. Click on "Explore & Download Repositories"  
4. Add `https://github.com/lotablet/better_calendar`, type **"Integration"**, then Add  
5. Search for "Better Calendar" and click download in the bottom right  
6. **Restart Home Assistant**  
7. OPTIONAL: if not configured, we recommend setting up Google Calendar integration — official guide here: [Google Calendar](https://www.home-assistant.io/integrations/google/)  
   Alternatively, you can add the local Home Assistant calendar by searching for "Calendar" in Integrations — this will create a local calendar entity usable with Better Calendar.  
9. Go to **Settings** → **Devices & Services**  
10. Click **"Add Integration"**  
11. Search for **"Better Calendar"** and configure your calendar  

   NOTE: For best experience,  

### Method 2: Manual Installation

1. Download the full repository from the Releases section  
2. Extract the files into `/config/custom_components/better_calendar/`  
3. The structure should be:  
```
/config/custom_components/better_calendar/
├── __init__.py
├── manifest.json
├── config_flow.py
├── coordinator.py
├── sensor.py
├── services.py
├── services.yaml
├── const.py
├── utils.py
└── translations/
    ├── en.json
    └── it.json
└── www/
    └── better-calendar-card.js
```
4. **Restart Home Assistant**  
5. Add the integration from **Devices & Services** menu  

### Automatic Frontend Card

The custom component also automatically installs the `better-calendar-card.js` card in the `www/` folder. No separate installation is needed.

## 🔧 Configuration

### 1. Integration Configuration

After installation, Better Calendar is configured via the GUI:

1. Go to **Settings** → **Devices & Services**  
2. Click **"Add Integration"**  
3. Search for **"Better Calendar"**  
4. Follow the guided setup:  
   - Select your main calendar  
   - Configure notification devices  
   - Set your preferences  

### 2. Add Card to Dashboard

The card is installed automatically. Add it to your Lovelace dashboard:

```yaml
type: custom:better-calendar-card
entities:
  - calendar.google_calendar
primary_calendar: calendar.google_calendar
theme: "dark"
default_view: "monthly"
```

## 📋 Full Configuration

### Card Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | **required** | `custom:better-calendar-card` |
| `entities` | array | **required** | List of calendar entities to display |
| `primary_calendar` | string | first in list | Main calendar for new events |
| `theme` | string | `"dark"` | Theme: `dark`, `light`, `google-dark`, `google-light` |
| `default_view` | string | `"monthly"`, `"weekly"`, `"daily"` | Default view |

### Advanced Configuration Example

```yaml
type: custom:better-calendar-card
entities:
  - calendar.google_calendar
  - calendar.work
primary_calendar: calendar.google_calendar
theme: "google-dark"
default_view: "monthly"
```

### Available Services

| Service | Description |
|---------|-------------|
| `better_calendar.force_update_calendars` | Force calendar update immediately |
| `better_calendar.create_event` | Create a new calendar event |
| `better_calendar.update_event` | Update an existing event |
| `better_calendar.delete_event` | Delete an event from the calendar |
| `better_calendar.add_notification` | Add notification for an event |
| `better_calendar.remove_notification` | Remove a specific notification |
| `better_calendar.toggle_notification` | Toggle a notification on/off |
| `better_calendar.snooze_event` | Snooze an event |
| `better_calendar.mark_event_done` | Mark event as completed |
| `better_calendar.debug_calendar_sync` | Calendar sync debug |

## 🚀 Usage

### Creating Events

1. **Click on a date** in the calendar  
2. A popup for event creation opens  
3. Fill in the fields:  
   - **Title**: Event name  
   - **Description**: Additional details  
   - **All Day**: Check for full-day events  
   - **Start/End**: Date and time  
4. **Configure notifications** (optional):  
   - **Push**: Mobile device notifications  
   - **Alexa**: Voice announcements  
5. Click **"Add Event"**

### Notification Management

#### Push Notifications
- Select mobile device  
- Choose timing (5 min, 15 min, 1 hour, etc.)  
- For custom timing:  
  - Specific time (e.g., 09:00)  
  - Days before (0–365)  
  - Custom message  

#### Alexa Notifications
- Select Echo device  
- Set timing and message  
- Support for variables: `{event_summary}`, `{event_time}`, `{event_date}`

### Editing Events

1. Click the event on the calendar  
2. Click the **pencil** ✏️ icon  
3. Edit the details  
4. Click **"Save Changes"**

### Event Notification Management

1. Click the **bell** 🔔 icon on an event  
2. View existing notifications  
3. Add new ones  
4. Remove unneeded notifications

## 🔧 Advanced Configuration

### Storage Files

The component automatically creates these files:

```
/config/custom_components/better_calendar/
├── better_calendar_events_[ID].json
├── better_calendar_notifications_[ID].json
```

## 📱 Custom Messages

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{event_summary}` | Event title | "Work meeting" |
| `{event_time}` | Event time | "14:30" |
| `{event_date}` | Event date | "21/07/2025" |
| `{offset_desc}` | Timing description | "15 minutes" |

### Example Messages

**Push Notification:**
```
🔔 Reminder: {event_summary} starts at {event_time} on {event_date}
```

**Alexa Announcement:**
```
Attention! {event_summary} will begin in {offset_desc}, at {event_time}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Card is not visible
- Clear your browser cache!

#### 2. Notifications not working
- Check that the Better Calendar integration is configured  
- Check logs: **Developer Tools** → **Logs**  
- Verify device configuration in the integration  
- Make sure `mobile_app`/`alexa_media` services exist

#### 3. Events not created
- Check calendar permissions in the integration settings  
- Verify Google Calendar connection  
- Check logs for sync errors  
- Make sure the same calendar entity is selected both in the custom component and the card!

#### 4. Card not displaying
- File `better-calendar-card.js` should be auto-installed  
- Check in `/config/custom_components/better_calendar/www/`  
- If missing, reinstall the custom component

### Logs and Debug

Enable detailed logging:

```yaml
# configuration.yaml
logger:
  default: warning
  logs:
    custom_components.better_calendar: debug
    frontend.js.latest.better_calendar_card: debug
```

### Reset Configuration

To fully reset:

1. Remove the integration from **Devices & Services**  
2. Restart Home Assistant  
3. Reinstall the custom component using the guide

## 📊 Dashboard Examples

### Desktop Dashboard

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

### Mobile Dashboard

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

### Multi-Calendar Dashboard

```yaml
views:
  - title: Calendars
    type: panel
    cards:
      - type: custom:better-calendar-card
        entities:
          - calendar.work
          - calendar.family
          - calendar.google_calendar
        primary_calendar: calendar.google_calendar
        theme: "google-light"
```

## 🤝 Contributing

### Reporting Bugs

1. Open an [issue](https://github.com/lotablet/better-calendar/issues)  
2. Include:
   - Home Assistant version  
   - Better Calendar version  
   - Integration configuration  
   - Error logs  
   - Screenshots if useful

### Feature Requests

1. Open a [feature request](https://github.com/lotablet/better-calendar/issues)  
2. Describe the feature in detail  
3. Explain the use case

## 📄 License

This project is released under the [MIT](LICENSE) license.

## 🙏 Acknowledgments

- ## Riccardo Rizzardi

---
