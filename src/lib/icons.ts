/**
 * Every Material Symbols glyph the UI can render, alphabetically sorted (required by the Google Fonts API).
 * The icon font is requested as a subset of these names (a few KB instead of ~4 MB).
 * Add a name here whenever you use a new <Icon name="..."> or store a new icon name in the database.
 */
export const ICON_NAMES = [
  "account_balance_wallet", "add_a_photo", "add_circle", "alarm", "architecture", "autorenew",
  "battery_5_bar", "bluetooth", "brush", "build", "calendar_month", "calendar_today", "camera_alt", "check",
  "check_circle", "chevron_left", "chevron_right", "close", "cloud_sync", "colorize", "content_cut",
  "done_all", "edit_note", "event_busy", "event_upcoming", "expand_more", "flag", "fullscreen", "handyman",
  "help_outline", "hub", "humidity_mid", "inventory_2", "more_horiz", "network_ping", "neurology",
  "notifications", "pace", "pest_control", "photo_camera", "photo_library", "pin", "play_arrow",
  "play_circle", "precision_manufacturing", "psychiatry", "recycling", "router", "sanitizer", "save",
  "science", "sensors", "settings", "settings_input_component", "shield", "shopping_basket", "shopping_cart",
  "sync", "task_alt", "thermostat", "timelapse", "timeline", "trending_down", "trending_up", "tune", "valve",
  "verified", "videocam", "visibility", "warning", "water_drop", "wb_sunny", "wifi",
] as const;

export const ICON_FONT_HREF =
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&icon_names=${ICON_NAMES.join(",")}&display=block`;
