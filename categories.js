// categories.js - Categorías inteligentes para lista de la compra

export const CATEGORIES = {
  frutas_verduras: {
    id: 'frutas_verduras',
    name: 'Frutas y Verduras',
    emoji: '🍎',
    color: '#10b981',
    bgColor: '#ecfdf5',
    keywords: [
      'manzana', 'platano', 'plátano', 'banana', 'naranja', 'mandarina', 'limon', 'limón',
      'pera', 'fresa', 'fresas', 'uva', 'uvas', 'melocoton', 'melocotón', 'sandia', 'sandía',
      'melon', 'melón', 'aguacate', 'tomate', 'tomates', 'lechuga', 'cebolla', 'cebollas',
      'patata', 'patatas', 'papa', 'papas', 'zanahoria', 'zanahorias', 'pimiento', 'pimientos',
      'ajo', 'ajos', 'pepino', 'calabacin', 'calabacín', 'berenjena', 'espinaca', 'espinacas',
      'brocoli', 'brócoli', 'champinon', 'champiñón', 'setas', 'champis', 'puerro', 'apio',
      'kiwi', 'mango', 'pinya', 'piña', 'cerezas', 'ciruela', 'arandanos', 'arándanos',
      'calabaza', 'coliflor', 'alcachofa', 'alcachofas', 'esparragos', 'espárragos', 'perejil'
    ]
  },
  lacteos_huevos: {
    id: 'lacteos_huevos',
    name: 'Lácteos y Huevos',
    emoji: '🥛',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    keywords: [
      'leche', 'queso', 'yogur', 'yogurt', 'yogures', 'huevo', 'huevos', 'mantequilla',
      'margarina', 'nata', 'cuajada', 'kefir', 'kéfir', 'parmesano', 'mozzarella',
      'gouda', 'cheddar', 'queso rallado', 'brie', 'camembert', 'queso fresco',
      'requeson', 'requesón', 'postre', 'flan', 'natillas', 'actimel'
    ]
  },
  carnes_pescados: {
    id: 'carnes_pescados',
    name: 'Carnes y Pescados',
    emoji: '🥩',
    color: '#e11d48',
    bgColor: '#fff1f2',
    keywords: [
      'pollo', 'pechuga', 'pechugas', 'ternera', 'cerdo', 'carne picada', 'lomo', 'costillas',
      'jamon', 'jamón', 'jamon york', 'jamon serrano', 'pavo', 'pechuga de pavo', 'salchichas',
      'hamburguesa', 'hamburguesas', 'bacon', 'chistorra', 'chorizo', 'salchichon', 'salchichón',
      'pescado', 'salmon', 'salmón', 'merluza', 'atun', 'atún', 'bacalao', 'dorada', 'lubina',
      'gambas', 'langostinos', 'calamar', 'calamares', 'pulpo', 'mejillones', 'sardinas',
      'alitas', 'chuletas', 'solomillo', 'conejo'
    ]
  },
  panaderia_cereales: {
    id: 'panaderia_cereales',
    name: 'Panadería y Cereales',
    emoji: '🥖',
    color: '#d97706',
    bgColor: '#fffbeb',
    keywords: [
      'pan', 'barra', 'baguette', 'pan de molde', 'tostadas', 'croissant', 'croissants',
      'magdalenas', 'bollo', 'bolleria', 'bollería', 'cereales', 'avena', 'muesli',
      'galletas', 'rosquillas', 'picos', 'colines', 'tortitas', 'harina', 'bizcocho',
      'barra de pan', 'pan rallado'
    ]
  },
  despensa_conservas: {
    id: 'despensa_conservas',
    name: 'Despensa y Conservas',
    emoji: '🥫',
    color: '#b45309',
    bgColor: '#fef3c7',
    keywords: [
      'arroz', 'pasta', 'macarrones', 'espaguetis', 'tallarines', 'fideos', 'aceite',
      'aceite de oliva', 'aceite girasol', 'vinagre', 'sal', 'azucar', 'azúcar', 'cafe',
      'café', 'te', 'té', 'infusion', 'infusión', 'tomate frito', 'tomate triturado',
      'atun en lata', 'conservas', 'sardinas en lata', 'garbanzos', 'lentejas', 'alubias',
      'fabada', 'sopa', 'caldo', 'mayonesa', 'ketchup', 'mostaza', 'salsa', 'soja',
      'oregano', 'orégano', 'pimienta', 'pimenton', 'pimentón', 'curry', 'canela',
      'miel', 'mermelada', 'nocilla', 'nutella', 'cacao', 'cola cao', 'colacao', 'nesquik',
      'frutos secos', 'nueces', 'almendras', 'pistachos', 'patatas fritas', 'snacks'
    ]
  },
  bebidas: {
    id: 'bebidas',
    name: 'Bebidas',
    emoji: '🥤',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    keywords: [
      'agua', 'botella de agua', 'garrafa', 'cerveza', 'cervezas', 'vino', 'vino tinto',
      'vino blanco', 'zumo', 'zumos', 'refresco', 'coca cola', 'cocacola', 'fanta',
      'sprite', 'tonica', 'tónica', 'aquarius', 'nestea', 'red bull', 'gaseosa',
      'leche de avena', 'leche de soja', 'leche de almendras'
    ]
  },
  limpieza_hogar: {
    id: 'limpieza_hogar',
    name: 'Limpieza y Hogar',
    emoji: '🧼',
    color: '#0891b2',
    bgColor: '#ecfeff',
    keywords: [
      'detergente', 'suavizante', 'lavavajillas', 'fairy', 'pastillas lavavajillas',
      'estropajo', 'estropajos', 'bayeta', 'bayetas', 'lejia', 'lejía', 'fregasuelos',
      'limpiador', 'limpiacristales', 'bolsas de basura', 'bolsa basura', 'papel de cocina',
      'papel aluminio', 'film transparente', 'fregona', 'escoba', 'desinfectante', 'insecticida'
    ]
  },
  higiene_cuidado: {
    id: 'higiene_cuidado',
    name: 'Higiene y Cuidado',
    emoji: '🧴',
    color: '#db2777',
    bgColor: '#fdf2f8',
    keywords: [
      'papel higienico', 'papel higiénico', 'gel', 'gel de ducha', 'champu', 'champú',
      'acondicionador', 'pasta de dientes', 'dentifrico', 'dentífrico', 'cepillo de dientes',
      'desodorante', 'jabon de manos', 'jabón', 'toallitas', 'panales', 'pañales',
      'compresas', 'tampones', 'cuchillas', 'crema', 'crema solar', 'algodon', 'algodón',
      'bastoncillos', 'colutorio', 'espuma de afeitar'
    ]
  },
  congelados: {
    id: 'congelados',
    name: 'Congelados',
    emoji: '❄️',
    color: '#2563eb',
    bgColor: '#eff6ff',
    keywords: [
      'congelado', 'congelados', 'helado', 'helados', 'pizza congelada', 'pizza',
      'guisantes congelados', 'pescado congelado', 'croquetas', 'patatas congeladas',
      'hielo', 'bolsa de hielo', 'verduras congeladas', 'nuggets'
    ]
  },
  otros: {
    id: 'otros',
    name: 'Otros',
    emoji: '🛒',
    color: '#64748b',
    bgColor: '#f8fafc',
    keywords: []
  }
};

// Sugerencias rápidas y frecuentes para añadir con un toque
export const QUICK_SUGGESTIONS = [
  { name: 'Leche', category: 'lacteos_huevos', quantity: '2' },
  { name: 'Huevos', category: 'lacteos_huevos', quantity: '1 docena' },
  { name: 'Pan', category: 'panaderia_cereales', quantity: '1' },
  { name: 'Plátanos', category: 'frutas_verduras', quantity: '1 kg' },
  { name: 'Tomates', category: 'frutas_verduras', quantity: '1 kg' },
  { name: 'Pechugas de pollo', category: 'carnes_pescados', quantity: '1 bandeja' },
  { name: 'Aceite de oliva', category: 'despensa_conservas', quantity: '1L' },
  { name: 'Arroz', category: 'despensa_conservas', quantity: '1 kg' },
  { name: 'Pasta', category: 'despensa_conservas', quantity: '1 paquete' },
  { name: 'Papel higiénico', category: 'higiene_cuidado', quantity: '1 paquete' },
  { name: 'Café', category: 'despensa_conservas', quantity: '1' },
  { name: 'Agua', category: 'bebidas', quantity: '1 garrafa' },
  { name: 'Yogures', category: 'lacteos_huevos', quantity: '1 pack' },
  { name: 'Detergente', category: 'limpieza_hogar', quantity: '1' },
  { name: 'Bolsas de basura', category: 'limpieza_hogar', quantity: '1 rollo' }
];

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta automáticamente la categoría de un producto por su nombre
 * @param {string} name
 * @returns {string} ID de la categoría detectada (o 'otros')
 */
export function detectCategory(name) {
  if (!name || typeof name !== 'string') return 'otros';
  const cleanName = normalizeText(name);
  const words = cleanName.split(/\s+/);

  for (const [catId, catData] of Object.entries(CATEGORIES)) {
    if (catId === 'otros') continue;
    for (const kw of catData.keywords) {
      const cleanKw = normalizeText(kw);
      // Coincidencia exacta o contenida en frase o palabra exacta
      if (cleanName === cleanKw || cleanName.includes(cleanKw) || words.includes(cleanKw)) {
        return catId;
      }
    }
  }

  return 'otros';
}
