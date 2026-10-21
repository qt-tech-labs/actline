/**
 * Every Material Symbols glyph the UI can render, alphabetically sorted (required by the Google Fonts API).
 * The icon font is requested as a subset of these names (a few KB instead of ~4 MB).
 * Add a name here whenever you use a new <Icon name="..."> or store a new icon name in the database.
 */
export const ICON_NAMES = [
  "account_balance_wallet", "add_a_photo", "add_circle", "alarm", "architecture", "arrow_forward",
  "auto_awesome", "autorenew",
  "battery_5_bar", "bluetooth", "brush", "build", "calendar_month", "calendar_today", "camera_alt", "check",
  "check_circle", "chevron_left", "chevron_right", "close", "cloud_off", "cloud_sync", "colorize", "content_cut",
  "directions_run", "done_all", "eco", "delete", "edit_note", "event_busy", "event_repeat", "event_upcoming",
  "expand_more", "file_download", "flag", "fullscreen", "handyman",
  "help_outline", "hub", "humidity_mid", "inventory_2", "language", "linear_scale", "location_on", "lock_clock", "more_horiz",
  "network_ping", "neurology",
  "notifications", "pace", "payments", "pest_control", "photo_camera", "photo_library", "pin", "play_arrow",
  "play_circle", "precision_manufacturing", "psychiatry", "psychology", "radio_button_unchecked", "recycling", "refresh", "router", "sanitizer", "save",
  "school", "science", "sensors", "sensors_off", "set_meal", "settings", "settings_backup_restore",
  "settings_input_component", "shield",
  "shield_with_heart", "shopping_basket", "shopping_cart", "smart_toy",
  "sync", "task", "task_alt", "thermostat", "timelapse", "timeline", "timer", "tips_and_updates", "today",
  "trending_down", "trending_up", "tune", "unfold_more", "valve",
  "verified", "videocam", "videocam_off", "visibility", "warning", "water_drop", "wb_sunny", "wifi", "wifi_off",
] as const;

export const ICON_FONT_HREF =
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&icon_names=${ICON_NAMES.join(",")}&display=block`;
