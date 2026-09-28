update public.perfiles
set rol = 'master'
where id in (
  select id
  from auth.users
  where email in ('ignacioricciutti@iico.edu.ar', 'ricciuttiignacio@gmail.com')
);
