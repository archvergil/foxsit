alter table public.habits
  add column custom_color text;

alter table public.habits
  add constraint habits_custom_color_valid
  check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$');
