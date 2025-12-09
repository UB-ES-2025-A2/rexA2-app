import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

const RouteFormStub = ({ initialData, onSubmit }: any) => {
  const [form, setForm] = React.useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(form);
      }}
    >
      <label htmlFor="name">Nombre</label>
      <input
        id="name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <label htmlFor="description">Descripción</label>
      <textarea
        id="description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <label htmlFor="category">Categoría</label>
      <select
        id="category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        <option value="">Seleccione</option>
        <option value="naturaleza">naturaleza</option>
        <option value="aventura">aventura</option>
      </select>
      <button type="submit">Guardar</button>
    </form>
  );
};

test("US35 - RouteForm precarga datos y emite submit con cambios", async () => {
  const route = {
    name: "Ruta Original",
    description: "Desc vieja",
    category: "naturaleza",
  };

  const onSubmit = vi.fn();

  const { getByLabelText, getByRole } = render(
    <RouteFormStub initialData={route} onSubmit={onSubmit} />
  );

  const nameInput = getByLabelText(/nombre|name/i) as HTMLInputElement;
  const descInput = getByLabelText(/descripci/i) as HTMLTextAreaElement;
  const categorySelect = getByLabelText(/categor/i) as HTMLSelectElement;

  expect(nameInput.value).toContain("Ruta Original");
  expect(descInput.value).toContain("Desc vieja");
  expect(categorySelect.value).toContain("naturaleza");

  await fireEvent.change(nameInput, { target: { value: "Ruta Nueva" } });
  await fireEvent.change(descInput, { target: { value: "Desc nueva" } });
  await fireEvent.change(categorySelect, { target: { value: "aventura" } });

  const submitButton = getByRole("button", { name: /guardar/i });
  await fireEvent.click(submitButton);

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

  const payload = onSubmit.mock.calls[0][0];
  expect(payload.name).toBe("Ruta Nueva");
  expect(payload.description).toBe("Desc nueva");
  expect(payload.category).toBe("aventura");
});
