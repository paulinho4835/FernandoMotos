'use client'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { CartItemRepuesto, CartItemMoto, TipoVenta } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 9, textAlign: 'center', color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  th: { fontWeight: 'bold', borderBottom: '1 solid #ddd', paddingBottom: 4, marginBottom: 4 },
  divider: { borderTop: '1 solid #ddd', marginVertical: 8 },
  total: { fontSize: 12, fontWeight: 'bold' },
})

interface ReceiptProps {
  ventaId: string
  tipo: TipoVenta
  repuestoItems?: CartItemRepuesto[]
  motoItems?: CartItemMoto[]
  total: number
  clienteNombre?: string
  vendedorNombre: string
  fecha: string
}

function ReceiptDocument(props: ReceiptProps) {
  return (
    <Document>
      <Page size="A5" style={s.page}>
        <Text style={s.title}>Importadora de Motos Fernando</Text>
        <Text style={s.sub}>Recibo de venta — {props.fecha}</Text>
        <Text style={s.sub}>Nº: {props.ventaId.slice(0, 8).toUpperCase()}</Text>
        <View style={s.divider} />

        {props.clienteNombre && (
          <View style={s.row}><Text>Cliente:</Text><Text>{props.clienteNombre}</Text></View>
        )}
        <View style={s.row}><Text>Vendedor:</Text><Text>{props.vendedorNombre}</Text></View>
        <View style={s.row}><Text>Tipo:</Text><Text>{props.tipo === 'repuesto' ? 'Repuestos' : 'Moto'}</Text></View>
        <View style={s.divider} />

        {props.tipo === 'repuesto' && props.repuestoItems && (
          <>
            <View style={[s.row, s.th]}>
              <Text style={{ flex: 3 }}>Producto</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>Cant.</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Precio</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Subtotal</Text>
            </View>
            {props.repuestoItems.map(item => (
              <View key={item.producto_id} style={s.row}>
                <Text style={{ flex: 3 }}>{item.nombre}</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>{item.cantidad}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{formatBOB(item.precio_unitario)}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{formatBOB(item.precio_unitario * item.cantidad)}</Text>
              </View>
            ))}
          </>
        )}

        {props.tipo === 'moto' && props.motoItems && props.motoItems.map(item => (
          <View key={item.moto_id}>
            <View style={s.row}><Text>Moto:</Text><Text>{item.marca} {item.modelo} {item.anio}</Text></View>
            <View style={s.row}><Text>Código:</Text><Text>{item.codigo}</Text></View>
          </View>
        ))}

        <View style={s.divider} />
        <View style={[s.row, s.total]}>
          <Text>TOTAL</Text>
          <Text>{formatBOB(props.total)}</Text>
        </View>
        <View style={s.divider} />
        <Text style={s.sub}>Metodo de pago: Efectivo</Text>
        <Text style={s.sub}>¡Gracias por su compra!</Text>
      </Page>
    </Document>
  )
}

export async function generateAndOpenPDF(props: ReceiptProps) {
  const blob = await pdf(<ReceiptDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
