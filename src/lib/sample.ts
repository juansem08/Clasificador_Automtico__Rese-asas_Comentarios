/** Datos de ejemplo (restaurante): incluye fechas, una duplicada y una vacía para mostrar la limpieza. */

const SAMPLE: [string, string, string][] = [
  ['02/06/2026', 'Ana R.', 'El mesero fue muy amable y nos atendió rapidísimo, volveremos.'],
  ['05/06/2026', 'Luis P.', 'Pedí una hamburguesa y llegó fría y con el pan duro.'],
  ['09/06/2026', 'Marta G.', 'Demasiado caro para lo que sirven, no vale la pena.'],
  ['12/06/2026', 'Jorge T.', 'Esperamos 40 minutos para que alguien tomara nuestra orden.'],
  ['16/06/2026', 'Sofía L.', 'La calidad de la carne es excelente, se nota que es fresca.'],
  ['20/06/2026', 'Diego M.', 'El precio es justo y las porciones son generosas.'],
  ['25/06/2026', 'Carla V.', 'Abren a las 9 am de lunes a sábado.'],
  ['01/07/2026', 'Pedro S.', 'La cajera fue grosera cuando pedí la factura.'],
  ['04/07/2026', 'Lucía F.', 'El postre estaba echado a perder, me sentí mal del estómago después.'],
  ['08/07/2026', 'Andrés C.', 'Me encantó la promoción 2x1 de los martes, súper económico.'],
  ['11/07/2026', 'Valeria N.', 'El pedido a domicilio llegó una hora tarde y nadie respondió el teléfono.'],
  ['15/07/2026', 'Tomás B.', 'Todo bien, nada especial.'],
  ['19/07/2026', 'Elena J.', 'El sabor del café es increíble, el mejor de la zona.'],
  ['23/07/2026', 'Raúl D.', 'Me cobraron dos veces el mismo producto en la tarjeta y nadie me da solución, voy a poner una queja formal.'],
  ['27/07/2026', 'Paula H.', 'Las papas siempre llegan blandas y aceitosas.'],
  ['02/08/2026', 'Miguel A.', 'Subieron los precios casi un 30% y la porción es más pequeña.'],
  ['06/08/2026', 'Daniela O.', 'Excelente atención de Carlos, muy atento con mi hija alérgica.'],
  ['10/08/2026', 'Fernando Q.', 'El pedido a domicilio llegó una hora tarde y nadie respondió el teléfono.'],
  ['14/08/2026', 'Gabriela K.', 'La pizza estaba deliciosa, masa crujiente y buenos ingredientes.'],
  ['18/08/2026', 'Héctor W.', ''],
  ['22/08/2026', 'Isabel Z.', '¿Tienen opciones veganas en el menú?'],
  ['26/08/2026', 'Julián E.', 'Nos ignoraron 20 minutos en la entrada aunque había mesas libres.'],
  ['30/08/2026', 'Karina U.', 'Buena relación calidad-precio, el menú del día es muy completo.'],
  ['04/09/2026', 'Leonardo I.', 'El jugo sabía a agua, muy decepcionante.'],
  ['09/09/2026', 'Mónica Y.', 'Los meseros siempre sonríen y recuerdan mi pedido, me siento como en casa.'],
  ['14/09/2026', 'Nicolás R.', 'Cobran la propina incluida sin avisar, me pareció abusivo.'],
  ['19/09/2026', 'Olga T.', 'La comida estaba buena pero el servicio fue lentísimo.'],
  ['24/09/2026', 'Pablo G.', 'Encontré un pelo en la sopa y el gerente no hizo nada.'],
  ['29/09/2026', 'Rosa M.', 'Precios accesibles para estudiantes, gracias por el descuento.'],
  ['05/10/2026', 'Samuel L.', 'Las hamburguesas son enormes y jugosas, 10 de 10.'],
  ['12/10/2026', 'Teresa P.', 'El local estaba sucio y los baños sin papel.'],
  ['19/10/2026', 'Ulises F.', 'Volvimos por tercera vez, la atención sigue siendo impecable.'],
];

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;

export const SAMPLE_NAME = 'ejemplo_restaurante.csv';
export const SAMPLE_CSV = [
  'Fecha,Cliente,Opinión',
  ...SAMPLE.map((row) => row.map(quote).join(',')),
].join('\n');
