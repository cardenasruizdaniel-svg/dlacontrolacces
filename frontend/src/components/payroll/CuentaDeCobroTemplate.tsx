import React, { forwardRef } from "react";

interface CuentaDeCobroProps {
  employee: any;
  company: any;
  period: any;
  amount: number;
}

function CuentaDeCobroTemplateRender(props: CuentaDeCobroProps, ref: React.Ref<HTMLDivElement>) {
  const { employee, company, period, amount } = props;
    
    // Fallbacks
    const empName = `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() || "Nombre del cobrador";
    const empDoc = employee?.document_number || "XXXXXXXX";
    const empAddress = employee?.address || "XXXXXXXX";
    const empPhone = employee?.phone || employee?.mobile || "XXXXXXXX";
    const empEmail = employee?.email || "XXXXXXXX";
    
    const compName = company?.name || "Nombre del cliente / contratante";
    const compNit = company?.tax_id || "NIT o Documento";
    const compAddress = company?.address || "Dirección del cliente";
    const city = company?.city || "Ciudad";
    
    const today = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    
    // Generar periodo dinámico (desde el 1 al último día del mes)
    const now = new Date();
    // Si viene en el periodo (ej. "2026-8") intentar parsearlo, si no, usar el mes actual
    let targetDate = now;
    if (period?.id && typeof period.id === 'string' && period.id.includes('-')) {
      const parts = period.id.replace("draft-", "").split("-");
      if (parts.length >= 2) {
         targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      }
    }
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(startOfMonth);
    const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const periodText = `Desde el 1 al ${endOfMonth.getDate()} de ${capitalizedMonthName} del ${targetDate.getFullYear()}`;
    
    const formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });

    const jobTitle = employee?.job_position?.title || "Prestación de Servicios Operativos / Labor en Campo";
    const paymentMethodText = employee?.payment_method;
    const bankName = employee?.bank_name;
    const bankAccountNumber = employee?.bank_account_number;
    const signatureUrl = employee?.signature_url;

    return (
      <div className="print-wrapper">
        <style type="text/css">
          {`
            @media print {
              body * { visibility: hidden; }
              .print-only-container, .print-only-container * { visibility: visible; }
              .print-only-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
              @page { margin: 0; size: auto; }
            }
          `}
        </style>
        <div ref={ref} className="bg-white text-black p-6 sm:p-10 font-sans max-w-4xl mx-auto border border-gray-200 print:border-none print:shadow-none print:m-0 print:p-6 print-only-container text-xs" style={{ minHeight: '297mm', width: '210mm' }}>
          
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 tracking-wider">CUENTA DE COBRO</h1>
        
        <table className="w-full border-collapse border border-gray-400 mb-6 text-xs">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold w-1/3">Fecha de expedición:</td>
              <td className="border border-gray-400 p-2">{today}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">Ciudad:</td>
              <td className="border border-gray-400 p-2">{city}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">Número de cuenta de cobro:</td>
              <td className="border border-gray-400 p-2 font-mono">{period?.id?.slice(0,8).toUpperCase() || "001"}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold bg-gray-50">Nombre del cobrador:</td>
              <td className="border border-gray-400 p-2 bg-gray-50">{empName}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold bg-gray-50">Documento de identidad:</td>
              <td className="border border-gray-400 p-2 bg-gray-50">{employee?.document_type || "C.C."} {empDoc}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold bg-gray-50">Dirección:</td>
              <td className="border border-gray-400 p-2 bg-gray-50">{empAddress}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">Nombre del cliente / contratante:</td>
              <td className="border border-gray-400 p-2">{compName}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">NIT o Documento:</td>
              <td className="border border-gray-400 p-2">{compNit}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-semibold">Dirección del cliente:</td>
              <td className="border border-gray-400 p-2">{compAddress}</td>
            </tr>
          </tbody>
        </table>
        
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Concepto del cobro</h2>
          <div className="grid grid-cols-[200px_1fr] gap-2 mb-2 text-xs">
            <div className="font-semibold">Descripción del servicio:</div>
            <div className="border-b border-gray-400 pb-1">{jobTitle}</div>
            
            <div className="font-semibold">Periodo del servicio:</div>
            <div className="border-b border-gray-400 pb-1">{periodText}</div>
            
            <div className="font-semibold mt-2 text-base">Valor a cobrar:</div>
            <div className="font-bold text-base mt-2">{formatter.format(amount)}</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Forma de pago</h2>
          <div className="grid grid-cols-[200px_1fr] gap-2 mb-2 text-xs">
            <div className="font-semibold">Entidad Bancaria:</div>
            <div className="border-b border-gray-400 pb-1 font-mono uppercase font-bold">{bankName || paymentMethodText || "____________________"}</div>

            <div className="font-semibold">Número de Cuenta:</div>
            <div className="border-b border-gray-400 pb-1 font-mono uppercase font-bold">{bankAccountNumber || "____________________"}</div>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">Declaración</h2>
          <p className="text-[11px] leading-tight text-justify">
            Declaro que la información contenida en esta cuenta de cobro es veraz y corresponde
            a los servicios efectivamente prestados. Este formato debe completarse de acuerdo
            con las obligaciones tributarias y contractuales que apliquen al caso, eximiendo al contratante 
            de responsabilidad solidaria sobre el pago de los aportes al sistema de seguridad social, 
            ya que actúo como trabajador independiente de acuerdo al decreto 1273 de 2018.
          </p>
        </div>

        <div className="mt-10 w-1/2">
          {signatureUrl && (
            <div className="mb-1">
              <img src={signatureUrl} alt="Firma del Empleado" style={{ maxHeight: "60px", objectFit: "contain" }} />
            </div>
          )}
          <div className="border-t border-black pt-1 mb-1">
            <span className="font-semibold text-xs">Firma del Cobrador</span>
          </div>
          <div className="text-[11px] leading-tight">
            <p><span className="font-semibold">Nombre:</span> {empName}</p>
            <p><span className="font-semibold">Documento:</span> {employee?.document_type || "C.C."} {empDoc}</p>
            <p><span className="font-semibold">Teléfono:</span> <a href={`tel:${empPhone}`} className="text-blue-600 underline print:text-black print:no-underline">{empPhone}</a></p>
          </div>
        </div>
        </div>
      </div>
    );
}

export const CuentaDeCobroTemplate = forwardRef(CuentaDeCobroTemplateRender);
CuentaDeCobroTemplate.displayName = "CuentaDeCobroTemplate";
