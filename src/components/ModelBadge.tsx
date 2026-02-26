import type { CatalogModel } from "../api";

const MODELS_DEV_LOGO_BASE = "https://models.dev/logos";

/** Extract the provider slug from a model ID like "anthropic/claude-opus-4-6" → "anthropic" */
function getProviderSlug(model: CatalogModel): string {
  const slash = model.id.indexOf("/");
  return slash > 0 ? model.id.slice(0, slash) : model.provider;
}

function ProviderLogo({ model, size = 20 }: { model: CatalogModel; size?: number }) {
  const slug = getProviderSlug(model);
  return (
    <img
      src={`${MODELS_DEV_LOGO_BASE}/${slug}.svg`}
      alt={slug}
      width={size}
      height={size}
      className="rounded-md shrink-0 dark:brightness-90"
      loading="lazy"
    />
  );
}

export function ModelBadge({
  model,
  showCost,
}: {
  model: CatalogModel | undefined;
  showCost?: boolean;
}) {
  if (!model) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <ProviderLogo model={model} />
      <span className="font-medium">{model.displayName}</span>
      {showCost && model.costPer1MTokens && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-0.5">
          ${model.costPer1MTokens.input}/{model.costPer1MTokens.output}
        </span>
      )}
    </span>
  );
}

export function ModelThumbnail({ model }: { model?: CatalogModel }) {
  if (!model) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        ?
      </span>
    );
  }
  return <ProviderLogo model={model} />;
}

/** URL for a model's provider logo — useful for charts / custom rendering */
export function getModelLogoUrl(model: CatalogModel): string {
  return `${MODELS_DEV_LOGO_BASE}/${getProviderSlug(model)}.svg`;
}
