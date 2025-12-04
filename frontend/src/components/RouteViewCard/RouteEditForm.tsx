import { useState } from "react";
import type { Category } from "../types";
import "../../styles/RouteEditForm.css";

export type RouteEditData = {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty?: string | null;
};

const CATEGORY_OPTIONS: Category[] = [
  "gastronomia",
  "naturaleza",
  "aventura",
  "cultura",
  "deporte",
  "historia",
  "urban",
  "entretenimiento",
  "otros",
];

const CATEGORY_LABELS: Record<string, string> = {
  gastronomia: "Gastronomía",
  naturaleza: "Naturaleza",
  aventura: "Aventura",
  cultura: "Cultura",
  deporte: "Deporte",
  historia: "Historia",
  urban: "Urbana",
  entretenimiento: "Entretenimiento",
  otros: "Otros",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Alta",
};

type Props = {
  data: RouteEditData;
  onCancel: () => void;
};

export default function RouteEditForm({ data, onCancel }: Props) {
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description);
  const [category, setCategory] = useState<Category>(data.category as Category);
  const [difficulty, setDifficulty] = useState<string>(data.difficulty || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Aquí se integrará la llamada a la API en la siguiente tarea.
    setTimeout(() => {
      setSaving(false);
      alert("Guardado pendiente de implementación.");
    }, 500);
  };

  return (
    <div className="route-edit-form">
      <header className="route-edit-form__header">
        <h2>Editar ruta</h2>
        <p>Actualiza el nombre, descripción y temática.</p>
      </header>

      <form className="route-edit-form__body" onSubmit={handleSubmit}>
        <label className="ref-label">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ruta urbana"
          required
        />

        <label className="ref-label">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />

        <label className="ref-label">Categoría / temática</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          required
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] ?? cat}
            </option>
          ))}
        </select>

        <label className="ref-label">Dificultad</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Seleccione dificultad…</option>
          <option value="easy">{DIFFICULTY_LABELS["easy"]}</option>
          <option value="medium">{DIFFICULTY_LABELS["medium"]}</option>
          <option value="hard">{DIFFICULTY_LABELS["hard"]}</option>
        </select>

        <div className="route-edit-form__actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
