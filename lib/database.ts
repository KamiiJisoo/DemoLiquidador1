import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Función para crear el cliente Supabase
function createSupabaseClient() {
  // Leer las variables de entorno en tiempo de ejecución
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required');
  }
  return createClient(url, key);
}

// Crear cliente Supabase solo cuando se necesite
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createSupabaseClient();
  }
  return supabase;
}

// Database connection function (for compatibility with existing code)
async function connectToDatabase() {
  // Test connection with a simple query that doesn't depend on specific tables
  try {
    // Test basic connection with a simple query
    const { data, error } = await getSupabaseClient()
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      // If information_schema doesn't work, try a simpler approach
      console.log('Testing connection with alternative method...');
      const { data: testData, error: testError } = await getSupabaseClient().auth.getSession();
      if (testError && testError.message.includes('Invalid API key')) {
        console.error('Error connecting to Supabase: Invalid API key');
        throw new Error('Invalid Supabase API key');
      }
    }
    
    console.log('Connected to Supabase database');
    
    // Initialize default data if needed (but don't fail if tables don't exist)
    await initializeDefaultData();
    
    return getSupabaseClient();
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

// Initialize default data
async function initializeDefaultData() {
  try {
    // Check if cargos table exists and has data
    const { data: cargos, error } = await getSupabaseClient()
      .from('cargos')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.cargos" does not exist')) {
        console.log('⚠️  Tabla "cargos" no existe. Asegúrate de ejecutar el script setup_supabase.sql');
        return;
      }
      console.error('Error checking cargos:', error);
      return;
    }
    
    // If no cargos exist, insert default ones
    if (!cargos || cargos.length === 0) {
      console.log('Insertando cargos predefinidos...');
      const cargosPredefinidos = [
        { nombre: 'BOMBERO', salario: 2054865 },
        { nombre: 'CABO DE BOMBERO', salario: 2197821 },
        { nombre: 'SARGENTO DE BOMBERO', salario: 2269299 },
        { nombre: 'TENIENTE DE BOMBERO', salario: 2510541 }
      ];

      const { error: insertError } = await getSupabaseClient()
        .from('cargos')
        .insert(cargosPredefinidos);
        
      if (insertError) {
        console.error('Error inserting default cargos:', insertError);
      } else {
        console.log('✅ Cargos predefinidos insertados correctamente');
      }
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

// Funciones de utilidad para Supabase
export async function registrarAcceso(ip: string) {
  const fecha = new Date().toISOString();
  console.log('Executing INSERT query for registrarAcceso...', { ip, fecha });
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('accesos')
      .insert([{ ip, fecha }])
      .select();
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.accesos" does not exist')) {
        throw new Error('Tabla "accesos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error executing INSERT query in registrarAcceso:', error);
      throw error;
    }
    
    console.log('INSERT query successful for registrarAcceso. Data:', data);
    return data;
  } catch (error) {
    console.error('Error in registrarAcceso:', error);
    throw error;
  }
}

export async function obtenerAccesos() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('accesos')
      .select('*')
      .order('fecha', { ascending: false });
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.accesos" does not exist')) {
        throw new Error('Tabla "accesos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error getting accesos:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in obtenerAccesos:', error);
    throw error;
  }
}

export async function limpiarAccesos() {
  try {
    const { error } = await getSupabaseClient()
      .from('accesos')
      .delete()
      .neq('id', 0); // Delete all records
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.accesos" does not exist')) {
        throw new Error('Tabla "accesos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error clearing accesos:', error);
      throw error;
    }
    
    console.log('Accesos cleared successfully');
  } catch (error) {
    console.error('Error in limpiarAccesos:', error);
    throw error;
  }
}

export async function agregarCargo(nombre: string, salario: number) {
  console.log('Executing INSERT query for agregarCargo...', { nombre, salario });
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('cargos')
      .insert([{ nombre, salario }])
      .select();
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.cargos" does not exist')) {
        throw new Error('Tabla "cargos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error executing INSERT query in agregarCargo:', error);
      throw error;
    }
    
    console.log('INSERT query successful for agregarCargo. Data:', data);
    return data;
  } catch (error) {
    console.error('Error in agregarCargo:', error);
    throw error;
  }
}

export async function obtenerCargos() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('cargos')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.cargos" does not exist')) {
        throw new Error('Tabla "cargos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error getting cargos:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in obtenerCargos:', error);
    throw error;
  }
}

export async function actualizarCargo(id: number, nombre: string, salario: number) {
  console.log('Executing UPDATE query for actualizarCargo...', { id, nombre, salario });
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('cargos')
      .update({ nombre, salario })
      .eq('id', id)
      .select();
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.cargos" does not exist')) {
        throw new Error('Tabla "cargos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error executing UPDATE query in actualizarCargo:', error);
      throw error;
    }
    
    console.log('UPDATE query successful for actualizarCargo. Data:', data);
    return data;
  } catch (error) {
    console.error('Error in actualizarCargo:', error);
    throw error;
  }
}

export async function eliminarCargo(id: number) {
  console.log('Executing DELETE query for eliminarCargo...', { id });
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('cargos')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.cargos" does not exist')) {
        throw new Error('Tabla "cargos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error executing DELETE query in eliminarCargo:', error);
      throw error;
    }
    
    console.log('DELETE query successful for eliminarCargo. Data:', data);
    return data;
  } catch (error) {
    console.error('Error in eliminarCargo:', error);
    throw error;
  }
}

export async function exportarBaseDeDatos() {
  try {
    const accesos = await obtenerAccesos();
    const cargos = await obtenerCargos();
    const festivos = await obtenerFestivos();
    const data = { accesos, cargos, festivos };
    fs.writeFileSync(path.join(process.cwd(), 'db_export.json'), JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error in exportarBaseDeDatos:', error);
    throw error;
  }
}

export async function agregarFestivo(fecha: string, nombre: string, tipo: 'FIJO' | 'MOVIL') {
  try {
    const { data, error } = await getSupabaseClient()
      .from('festivos')
      .insert([{ fecha, nombre, tipo }])
      .select();
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.festivos" does not exist')) {
        throw new Error('Tabla "festivos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error al agregar festivo:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in agregarFestivo:', error);
    throw error;
  }
}

export async function obtenerFestivos() {
  try {
    const { data, error } = await getSupabaseClient()
      .from('festivos')
      .select('*')
      .order('fecha', { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.festivos" does not exist')) {
        throw new Error('Tabla "festivos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error getting festivos:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in obtenerFestivos:', error);
    throw error;
  }
}

export async function obtenerFestivosPorAño(año: number) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('festivos')
      .select('*')
      .gte('fecha', `${año}-01-01`)
      .lt('fecha', `${año + 1}-01-01`)
      .order('fecha', { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.festivos" does not exist')) {
        throw new Error('Tabla "festivos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error getting festivos por año:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in obtenerFestivosPorAño:', error);
    throw error;
  }
}

export async function eliminarFestivo(fecha: string) {
  try {
    console.log('Eliminando festivo en la base de datos con fecha:', fecha);
    
    // Primero intentamos encontrar el festivo
    const { data: festivos, error: findError } = await getSupabaseClient()
      .from('festivos')
      .select('*')
      .eq('fecha', fecha);
      
    if (findError) {
      if (findError.code === 'PGRST116' || findError.message.includes('relation "public.festivos" does not exist')) {
        throw new Error('Tabla "festivos" no existe. Ejecuta el script setup_supabase.sql primero.');
      }
      console.error('Error finding festivo:', findError);
      throw findError;
    }
    
    console.log('Festivos encontrados:', festivos);
    
    if (!festivos || festivos.length === 0) {
      console.error('No se encontró ningún festivo con la fecha:', fecha);
      return { data: null, count: 0 };
    }
    
    const { data, error } = await getSupabaseClient()
      .from('festivos')
      .delete()
      .eq('fecha', fecha)
      .select();
      
    if (error) {
      console.error('Error al eliminar festivo:', error);
      throw error;
    }
    
    console.log('Resultado de la eliminación:', data);
    return { data, count: data?.length || 0 };
  } catch (error) {
    console.error('Error in eliminarFestivo:', error);
    throw error;
  }
}

export { connectToDatabase, getSupabaseClient }; 