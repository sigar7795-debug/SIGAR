import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

type Property = {
  id: number;
  name: string;
  municipality: string | null;
  state: string | null;
};

type PropertySelectorProps = {
  properties: Property[] | undefined;
  value: number | undefined;
  onChange: (propertyId: number | undefined) => void;
  disabled?: boolean;
};

export function PropertySelector({
  properties,
  value,
  onChange,
  disabled = false,
}: PropertySelectorProps) {
  useEffect(() => {
    if (!value && properties?.[0]) onChange(properties[0].id);
    if (value && properties && !properties.some(property => property.id === value)) {
      onChange(properties[0]?.id);
    }
  }, [onChange, properties, value]);

  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={nextValue => onChange(Number(nextValue))}
      disabled={disabled || !properties?.length}
    >
      <SelectTrigger className="h-11 min-w-[220px] rounded-none border-olive/35 bg-transparent text-left text-graphite shadow-none hover:bg-accent focus:ring-field/50">
        <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <SelectValue placeholder="Selecione uma propriedade" />
      </SelectTrigger>
      <SelectContent className="rounded-none border-olive/35 bg-card text-card-foreground">
        {properties?.map(property => (
          <SelectItem
            key={property.id}
            value={String(property.id)}
            className="focus:bg-accent focus:text-accent-foreground"
          >
            <span>{property.name}</span>
            {property.municipality ? (
              <span className="ml-2 text-xs text-muted-foreground">
                {property.municipality}{property.state ? `, ${property.state}` : ""}
              </span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
