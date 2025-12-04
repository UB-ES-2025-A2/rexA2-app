import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "../types";
import { useAlert } from "../../context/AlertContext";
import { fetchWithAuth } from "../../services/api";
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
  onSaved?: (route: any) => void;
};

export default function RouteEditForm({ data, onCancel, onSaved }: Props) {
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description);
  const [category, setCategory] = useState<Category>(data.category as Category);
  const [difficulty, setDifficulty] = useState<string>(data.difficulty || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showAlert } = useAlert();
  const initialSnapshotRef = useRef({
    name: data.name,
    description: data.description,
    category: data.category,
    difficulty: data.difficulty || "",
  });

  useEffect(() => {
    // Actualiza el snapshot si cambia la ruta a editar
    initialSnapshotRef.current = {
      name: data.name,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty || "",
    };
    setName(data.name);
    setDescription(data.description);
    setCategory(data.category as Category);
    setDifficulty(data.difficulty || "");
    setError(null);
  }, [data]);

  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    return (
      snap.name !== name ||
      snap.description !== description ||
      snap.category !== category ||
      (snap.difficulty || "") !== (difficulty || "")
    );
  }, [name, description, category, difficulty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const validate = () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return false;
    }
    if (name.trim().length > 60) {
      setError("El nombre debe tener 60 caracteres o menos.");
      return false;
    }
    if (!description.trim()) {
      setError("La descripción es obligatoria.");
      return false;
    }
    if (!category) {
      setError("Selecciona una categoría.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/routes/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          difficulty: difficulty || null,
        }),
      });

      if (!res.ok) {
        const detail =
          (await res.json().catch(() => null))?.detail ||
          "No se han podido guardar los cambios.";
        showAlert(detail, "error");
        setError(detail);
        return;
      }

      const updated = await res.json();
      showAlert("Ruta actualizada correctamente", "success");
      initialSnapshotRef.current = {
        name,
        description,
        category,
        difficulty: difficulty || "",
      };
      onSaved?.(updated);
    } catch (err) {
      console.error(err);
      const detail = "No se han podido guardar los cambios. Inténtalo de nuevo.";
      showAlert(detail, "error");
      setError(detail);
    } finally {
      setSaving(false);
    }
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
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (isDirty) {
                const leave = window.confirm(
                  "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?"
                );
                if (!leave) return;
              }
              onCancel();
            }}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {error ? <p className="ref-error">{error}</p> : null}
      </form>
    </div>
  );
}
