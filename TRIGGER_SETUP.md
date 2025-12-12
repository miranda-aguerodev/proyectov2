# Setup Trigger para Auto-crear Perfil de Usuario

## Problema
Cuando un usuario se registra, su perfil no se crea automáticamente en la tabla `profiles`, causando error "error in database not creating the user".

## Solución
Ejecuta el siguiente SQL en la consola de **SQL Editor** de Supabase:

```sql
-- Crear función para nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Pasos
1. Ve a tu proyecto en Supabase
2. Click en **SQL Editor** en el menú izquierdo
3. Click en **New Query**
4. Copia y pega el SQL anterior
5. Click en **Run** para ejecutar

## Resultado
Ahora cuando un usuario se registre, automáticamente se creará una entrada en la tabla `profiles` con su ID y nombre completo.
