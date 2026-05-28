'use client'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { CartItemRepuesto, CartItemMoto, TipoVenta } from '@/lib/types'
import { formatBOB } from '@/lib/utils/formatCurrency'

// 80mm thermal receipt: 226.77pt wide
const W = 226.77

const s = StyleSheet.create({
  page:    { padding: '6mm 5mm', fontSize: 8, fontFamily: 'Helvetica', width: W },
  title:   { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  sub:     { fontSize: 7, textAlign: 'center', color: '#555', marginBottom: 1 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  th:      { fontWeight: 'bold', borderBottom: '0.5 solid #000', paddingBottom: 2, marginBottom: 3 },
  divider: { borderTop: '0.5 solid #000', marginVertical: 4 },
  total:   { fontSize: 10, fontWeight: 'bold' },
  label:   { color: '#444' },
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
      <Page size={[W, 800]} style={s.page}>
        <Text style={s.title}>Importadora de Motos Fernando</Text>
        <View style={s.divider} />

        <View style={s.row}>
          <Text style={s.label}>Fecha:</Text>
          <Text>{props.fecha}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Recibo Nº:</Text>
          <Text>{props.ventaId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {props.clienteNombre && (
          <View style={s.row}>
            <Text style={s.label}>Cliente:</Text>
            <Text>{props.clienteNombre}</Text>
          </View>
        )}
        <View style={s.row}>
          <Text style={s.label}>Vendedor:</Text>
          <Text>{props.vendedorNombre}</Text>
        </View>

        <View style={s.divider} />

        {props.tipo === 'repuesto' && props.repuestoItems && (
          <>
            <View style={[s.row, s.th]}>
              <Text style={{ flex: 4 }}>Producto</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>Cant</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Precio</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Subtotal</Text>
            </View>
            {props.repuestoItems.map(item => (
              <View key={item.producto_id} style={s.row}>
                <Text style={{ flex: 4 }}>{item.nombre}</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>{item.cantidad}</Text>
                <Text style={{ flex: 2, textAlign: 'right' }}>{formatBOB(item.precio_unitario)}</Text>
                <Text style={{ flex: 2, textAlign: 'right' }}>{formatBOB(item.precio_unitario * item.cantidad)}</Text>
              </View>
            ))}
          </>
        )}

        {props.tipo === 'moto' && props.motoItems && props.motoItems.map(item => (
          <View key={item.moto_id}>
            <View style={s.row}>
              <Text style={s.label}>Moto:</Text>
              <Text>{item.marca} {item.modelo} {item.anio}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Código:</Text>
              <Text>{item.codigo}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Precio:</Text>
              <Text>{formatBOB(item.precio_unitario)}</Text>
            </View>
          </View>
        ))}

        <View style={s.divider} />
        <View style={[s.row, s.total]}>
          <Text>TOTAL</Text>
          <Text>{formatBOB(props.total)}</Text>
        </View>
        <View style={s.divider} />
        <Text style={s.sub}>Pago: Efectivo</Text>
        <Text style={s.sub}>¡Gracias por su compra!</Text>
      </Page>
    </Document>
  )
}

export async function generateAndOpenPDF(props: ReceiptProps) {
  const blob = await pdf(<ReceiptDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)

  // Open in new tab and trigger print dialog
  const win = window.open(url, '_blank')
  if (win) {
    win.addEventListener('load', () => {
      win.print()
    })
  }

  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
