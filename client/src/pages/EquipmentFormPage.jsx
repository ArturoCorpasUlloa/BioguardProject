import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { areasApi, equipmentApi } from '../services/api';

const initialForm = {
  name: '',
  brand: '',
  model: '',
  serialNumber: '',
  inventoryCode: '',
  areaId: '',
  location: '',
  status: 'ACTIVE',
  riskClassification: '',
  manufacturer: '',
  importer: '',
  manufacturingYear: '',
  acquisitionDate: '',
  provider: '',
  modality: '',
  providerPhone: '',
  providerEmail: '',
  providerContactPerson: '',
  warrantyExpiration: '',
  technicalResponsible: '',
  maintenanceFrequency: '',
  installationDate: '',
  usefulLifeYears: '',
  equipmentType: '',
  technology: '',
  powerSupply: '',
  voltage: '',
  power: '',
  invimaRegistration: '',
  invimaExpiration: '',
  photoPath: '',
  observations: '',
  contractStartDate: '',
  contractEndDate: '',
  contractNumber: '',
  contractCompany: '',
  contractCost: '',
  contractAutomaticRenewal: false,
  contractWithParts: false,
  contractType: '',
  contractCoverage: '',
  contractObservations: '',
  qualityControlDate: '',
  qualityNextControlDate: '',
  qualityCost: '',
  lastCalibrationDate: '',
  nextCalibrationDate: '',
  licenseRegistrationNumber: '',
  licenseType: '',
  licenseInitialDate: '',
  licenseTramitDate: '',
  licenseExpirationDate: '',
  dicomAeTitle: '',
  risAeTitle: '',
  dicomPacsAeTitle: '',
  dicomIpAddress: '',
  risIpAddress: '',
  pacsIpAddress: '',
  dicomPort: '',
  risPort: '',
  pacsPort: '',
  anidesk: '',
  dicomUsername: '',
  anideskPassword: '',
  dicomObservations: '',
};

export default function EquipmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    areasApi.list().then(setAreas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    equipmentApi
      .get(id)
      .then((data) =>
        setForm({
          ...initialForm,
          ...data,
          areaId: data.areaId || '',
          manufacturingYear: data.manufacturingYear || '',
          usefulLifeYears: data.usefulLifeYears || '',
          acquisitionDate: data.acquisitionDate?.slice(0, 10) || '',
          provider: data.provider || '',
          modality: data.modality || '',
          providerPhone: data.providerPhone || '',
          providerEmail: data.providerEmail || '',
          providerContactPerson: data.providerContactPerson || '',
          warrantyExpiration: data.warrantyExpiration?.slice(0, 10) || '',
          technicalResponsible: data.technicalResponsible || '',
          maintenanceFrequency: data.maintenanceFrequency || '',
          installationDate: data.installationDate?.slice(0, 10) || '',
          invimaExpiration: data.invimaExpiration?.slice(0, 10) || '',
          photoPath: data.photoPath || '',
          contractStartDate: data.contracts?.[0]?.startDate?.slice(0, 10) || '',
          contractEndDate: data.contracts?.[0]?.endDate?.slice(0, 10) || '',
          contractNumber: data.contracts?.[0]?.contractNumber || '',
          contractCompany: data.contracts?.[0]?.company || '',
          contractCost: data.contracts?.[0]?.cost ?? '',
          contractAutomaticRenewal: Boolean(data.contracts?.[0]?.automaticRenewal),
          contractWithParts: Boolean(data.contracts?.[0]?.withParts),
          contractType: data.contracts?.[0]?.contractType || '',
          contractCoverage: data.contracts?.[0]?.coverage || '',
          contractObservations: data.contracts?.[0]?.observations || '',
          qualityControlDate: data.qualityControls?.[0]?.controlDate?.slice(0, 10) || '',
          qualityNextControlDate: data.qualityControls?.[0]?.nextControlDate?.slice(0, 10) || '',
          qualityCost: data.qualityControls?.[0]?.cost ?? '',
          licenseRegistrationNumber: data.licenses?.[0]?.registrationNumber || '',
          licenseType: data.licenses?.[0]?.licenseType || '',
          licenseInitialDate: data.licenses?.[0]?.initialDate?.slice(0, 10) || '',
          licenseTramitDate: data.licenses?.[0]?.tramitDate?.slice(0, 10) || '',
          licenseExpirationDate: data.licenses?.[0]?.expirationDate?.slice(0, 10) || '',
          lastCalibrationDate: data.calibrations?.[0]?.lastCalibrationDate?.slice(0, 10) || '',
          nextCalibrationDate: data.calibrations?.[0]?.nextCalibrationDate?.slice(0, 10) || '',
          dicomAeTitle: data.dicomConfig?.aeTitle || '',
          risAeTitle: data.dicomConfig?.risAeTitle || '',
          dicomPacsAeTitle: data.dicomConfig?.pacsAeTitle || '',
          dicomIpAddress: data.dicomConfig?.ipAddress || '',
          risIpAddress: data.dicomConfig?.risIpAddress || '',
          pacsIpAddress: data.dicomConfig?.pacsIpAddress || '',
          dicomPort: data.dicomConfig?.port || '',
          risPort: data.dicomConfig?.risPort || '',
          pacsPort: data.dicomConfig?.pacsPort || '',
          anidesk: data.dicomConfig?.anidesk || '',
          dicomUsername: data.dicomConfig?.username || '',
          dicomObservations: data.dicomConfig?.observations || '',
        })
      )
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...form,
      manufacturingYear: form.manufacturingYear ? Number(form.manufacturingYear) : null,
      usefulLifeYears: form.usefulLifeYears ? Number(form.usefulLifeYears) : null,
      areaId: form.areaId || null,
      contract: {
        contractNumber: form.contractNumber || null,
        startDate: form.contractStartDate || null,
        endDate: form.contractEndDate || null,
        company: form.contractCompany || null,
        cost: form.contractCost === '' ? null : Number(form.contractCost),
        automaticRenewal: Boolean(form.contractAutomaticRenewal),
        withParts: Boolean(form.contractWithParts),
        contractType: form.contractType || null,
        coverage: form.contractCoverage || null,
        observations: form.contractObservations || null,
      },
      calibration: {
        lastCalibrationDate: form.lastCalibrationDate || null,
        nextCalibrationDate: form.nextCalibrationDate || null,
      },
      license: {
        licenseType: form.licenseType || null,
        registrationNumber: form.licenseRegistrationNumber || null,
        initialDate: form.licenseInitialDate || null,
        tramitDate: form.licenseTramitDate || null,
        expirationDate: form.licenseExpirationDate || null,
      },
      qualityControl: {
        controlDate: form.qualityControlDate || null,
        nextControlDate: form.qualityNextControlDate || null,
        cost: form.qualityCost === '' ? null : Number(form.qualityCost),
      },
      dicom: {
        aeTitle: form.dicomAeTitle || null,
        risAeTitle: form.risAeTitle || null,
        pacsAeTitle: form.dicomPacsAeTitle || null,
        ipAddress: form.dicomIpAddress || null,
        risIpAddress: form.risIpAddress || null,
        pacsIpAddress: form.pacsIpAddress || null,
        port: form.dicomPort ? Number(form.dicomPort) : null,
        risPort: form.risPort ? Number(form.risPort) : null,
        pacsPort: form.pacsPort ? Number(form.pacsPort) : null,
        anidesk: form.anidesk || null,
        username: form.dicomUsername || null,
        password: form.anideskPassword || null,
        observations: form.dicomObservations || null,
      },
    };

    try {
      const saved = isEdit
        ? await equipmentApi.update(id, payload)
        : await equipmentApi.create(payload);
      if (attachmentFile) {
        await equipmentApi.uploadDocument(saved.id, attachmentFile);
      }
      navigate(`/equipos/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Editar hoja de vida' : 'Nueva hoja de vida'}</h1>
          <p>Registra la información general, técnica, INVIMA y observaciones.</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>Foto del equipo</h2>
        <div className="form-field">
          <label>Subir foto o documento PDF</label>
          <input className="input" type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} />
          {attachmentFile && <small>{attachmentFile.name}</small>}
          {form.photoPath && <img src={form.photoPath} alt="Equipo" style={{ maxWidth: 180, borderRadius: 8 }} />}
        </div>
        <h2>Información general</h2>
        <div className="form-grid">
          <Field label="Nombre del equipo" value={form.name} onChange={(v) => updateField('name', v)} required />
          <Field label="Marca" value={form.brand} onChange={(v) => updateField('brand', v)} required />
          <Field label="Modelo" value={form.model} onChange={(v) => updateField('model', v)} />
          <Field label="Número de serie" value={form.serialNumber} onChange={(v) => updateField('serialNumber', v)} required />
          <Field label="Código inventario" value={form.inventoryCode} onChange={(v) => updateField('inventoryCode', v)} />
          <div className="form-field">
            <label>Área</label>
            <select className="select" value={form.areaId} onChange={(e) => updateField('areaId', e.target.value)}>
              <option value="">Seleccionar</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Ubicación" value={form.location} onChange={(v) => updateField('location', v)} />
          <div className="form-field">
            <label>Estado</label>
            <select className="select" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="MAINTENANCE">En mantenimiento</option>
              <option value="RETIRED">Dado de baja</option>
            </select>
          </div>
          <div className="form-field">
            <label>Clasificación de riesgo</label>
            <select className="select" value={form.riskClassification} onChange={(e) => updateField('riskClassification', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="CLASS_I">Clase I</option>
              <option value="CLASS_IIA">Clase IIA</option>
              <option value="CLASS_IIB">Clase IIB</option>
              <option value="CLASS_III">Clase III</option>
            </select>
          </div>
        </div>

        <h2>Información técnica</h2>
        <div className="form-grid">
          <Field label="Fabricante" value={form.manufacturer} onChange={(v) => updateField('manufacturer', v)} />
          <Field label="Importador" value={form.importer} onChange={(v) => updateField('importer', v)} />
          <Field label="Año fabricación" value={form.manufacturingYear} onChange={(v) => updateField('manufacturingYear', v)} type="number" />
          <Field label="Fecha adquisición" value={form.acquisitionDate} onChange={(v) => updateField('acquisitionDate', v)} type="date" />
          <Field label="Proveedor" value={form.provider} onChange={(v) => updateField('provider', v)} />
          <Field label="Modalidad" value={form.modality} onChange={(v) => updateField('modality', v)} />
          <Field label="Teléfono proveedor" value={form.providerPhone} onChange={(v) => updateField('providerPhone', v)} />
          <Field label="Email proveedor" value={form.providerEmail} onChange={(v) => updateField('providerEmail', v)} type="email" />
          <Field label="Persona de contacto" value={form.providerContactPerson} onChange={(v) => updateField('providerContactPerson', v)} />
          <Field label="Vencimiento de garantía" value={form.warrantyExpiration} onChange={(v) => updateField('warrantyExpiration', v)} type="date" />
          <Field label="Responsable técnico" value={form.technicalResponsible} onChange={(v) => updateField('technicalResponsible', v)} />
          <Field label="Frecuencia plan de mantenimiento" value={form.maintenanceFrequency} onChange={(v) => updateField('maintenanceFrequency', v)} />
          <Field label="Fecha instalación" value={form.installationDate} onChange={(v) => updateField('installationDate', v)} type="date" />
          <Field label="Vida útil (años)" value={form.usefulLifeYears} onChange={(v) => updateField('usefulLifeYears', v)} type="number" />
          <Field label="Tipo de equipo" value={form.equipmentType} onChange={(v) => updateField('equipmentType', v)} />
          <Field label="Tecnología" value={form.technology} onChange={(v) => updateField('technology', v)} />
          <Field label="Fuente alimentación" value={form.powerSupply} onChange={(v) => updateField('powerSupply', v)} />
          <Field label="Voltaje" value={form.voltage} onChange={(v) => updateField('voltage', v)} />
          <Field label="Potencia" value={form.power} onChange={(v) => updateField('power', v)} />
        </div>

        <h2>INVIMA</h2>
        <div className="form-grid">
          <Field label="Registro INVIMA" value={form.invimaRegistration} onChange={(v) => updateField('invimaRegistration', v)} />
          <Field label="Vigencia INVIMA" value={form.invimaExpiration} onChange={(v) => updateField('invimaExpiration', v)} type="date" />
        </div>

        <h2>Contratos, licencias y calidad</h2>
        <div className="form-grid">
          <Field label="Número de contrato" value={form.contractNumber} onChange={(v) => updateField('contractNumber', v)} />
          <Field label="Inicio contrato mantenimiento" value={form.contractStartDate} onChange={(v) => updateField('contractStartDate', v)} type="date" />
          <Field label="Fin contrato mantenimiento" value={form.contractEndDate} onChange={(v) => updateField('contractEndDate', v)} type="date" />
          <Field label="Empresa del contrato" value={form.contractCompany} onChange={(v) => updateField('contractCompany', v)} />
          <div className="form-field"><label>Tipo de contrato</label><select className="select" value={form.contractType} onChange={(e) => updateField('contractType', e.target.value)}><option value="">Seleccionar</option><option value="WITH_PARTS">Con partes/repuestos incluidos</option><option value="LABOR_ONLY">Solo mano de obra</option><option value="SERVICE_PROVISION">Prestación de servicios</option></select></div>
          <label className="form-field"><span>Auto-renovación</span><span className="checkbox-field"><input type="checkbox" checked={Boolean(form.contractAutomaticRenewal)} onChange={(e) => updateField('contractAutomaticRenewal', e.target.checked)} /> Sí, se renueva automáticamente</span></label>
          <Field label="Costo del contrato" value={form.contractCost} onChange={(v) => updateField('contractCost', v)} type="number" />
          <Field label="Cobertura del contrato" value={form.contractCoverage} onChange={(v) => updateField('contractCoverage', v)} />
          <Field label="Observaciones del contrato" value={form.contractObservations} onChange={(v) => updateField('contractObservations', v)} />
          <Field label="Último control de calidad" value={form.qualityControlDate} onChange={(v) => updateField('qualityControlDate', v)} type="date" />
          <Field label="Próximo control de calidad" value={form.qualityNextControlDate} onChange={(v) => updateField('qualityNextControlDate', v)} type="date" />
          <Field label="Costo del control" value={form.qualityCost} onChange={(v) => updateField('qualityCost', v)} type="number" />
          <Field label="Número de licencia / registro" value={form.licenseRegistrationNumber} onChange={(v) => updateField('licenseRegistrationNumber', v)} />
          <Field label="Tipo de licencia" value={form.licenseType} onChange={(v) => updateField('licenseType', v)} />
          <Field label="Fecha inicial de licencia" value={form.licenseInitialDate} onChange={(v) => updateField('licenseInitialDate', v)} type="date" />
          <Field label="Fecha de trámite de licencia" value={form.licenseTramitDate} onChange={(v) => updateField('licenseTramitDate', v)} type="date" />
          <Field label="Vencimiento de licencia" value={form.licenseExpirationDate} onChange={(v) => updateField('licenseExpirationDate', v)} type="date" />
          <Field label="Última calibración" value={form.lastCalibrationDate} onChange={(v) => updateField('lastCalibrationDate', v)} type="date" />
          <Field label="Próxima calibración" value={form.nextCalibrationDate} onChange={(v) => updateField('nextCalibrationDate', v)} type="date" />
        </div>

        <h2>Configuración DICOM / PACS / AniDesk</h2>
        <div className="form-grid">
          <Field label="AETitle del equipo" value={form.dicomAeTitle} onChange={(v) => updateField('dicomAeTitle', v)} />
          <Field label="AETitle de RIS" value={form.risAeTitle} onChange={(v) => updateField('risAeTitle', v)} />
          <Field label="AETitle del PACS / servidor" value={form.dicomPacsAeTitle} onChange={(v) => updateField('dicomPacsAeTitle', v)} />
          <Field label="Dirección IP" value={form.dicomIpAddress} onChange={(v) => updateField('dicomIpAddress', v)} />
          <Field label="IP de RIS" value={form.risIpAddress} onChange={(v) => updateField('risIpAddress', v)} />
          <Field label="IP de PACS" value={form.pacsIpAddress} onChange={(v) => updateField('pacsIpAddress', v)} />
          <Field label="Puerto DICOM" value={form.dicomPort} onChange={(v) => updateField('dicomPort', v)} type="number" />
          <Field label="Puerto de RIS" value={form.risPort} onChange={(v) => updateField('risPort', v)} type="number" />
          <Field label="Puerto de PACS" value={form.pacsPort} onChange={(v) => updateField('pacsPort', v)} type="number" />
          <Field label="ID de AniDesk" value={form.anidesk} onChange={(v) => updateField('anidesk', v)} />
          <Field label="Usuario" value={form.dicomUsername} onChange={(v) => updateField('dicomUsername', v)} />
          <Field label="Clave de AniDesk" value={form.anideskPassword} onChange={(v) => updateField('anideskPassword', v)} type="password" />
          <div className="form-field">
            <label>Observaciones DICOM / RIS / PACS</label>
            <textarea
              className="textarea"
              value={form.dicomObservations}
              onChange={(e) => updateField('dicomObservations', e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>Observaciones</label>
          <textarea
            className="textarea"
            value={form.observations}
            onChange={(e) => updateField('observations', e.target.value)}
          />
        </div>

        {error && <div className="card" style={{ background: '#fee2e2' }}>{error}</div>}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar hoja de vida'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
