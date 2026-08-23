create or replace function public.manejar_nuevo_usuario()
returns trigger as $$
begin
  insert into public.usuarios (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();
