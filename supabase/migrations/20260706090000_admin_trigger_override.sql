-- Update new user signup trigger to automatically set ADMIN role for jaminishannu9k@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  IF (new.raw_user_meta_data->>'role' = 'OWNER') then
    assigned_role := 'OWNER';
  ELSE
    assigned_role := 'CUSTOMER';
  END IF;

  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, assigned_role);
  
  IF (assigned_role = 'OWNER') then
    INSERT INTO public.owner_profiles (user_id, full_name, business_name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'New Owner'), COALESCE(new.raw_user_meta_data->>'full_name', 'New Owner') || 's Business');
  ELSIF (assigned_role = 'CUSTOMER') then
    INSERT INTO public.customer_profiles (user_id, full_name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'New Customer'));
  END IF;
  RETURN new;
END;
$$;
