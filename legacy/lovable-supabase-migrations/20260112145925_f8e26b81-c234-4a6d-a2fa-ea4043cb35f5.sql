-- Insert report settings configuration
INSERT INTO system_settings (key, value, description)
VALUES (
  'report_settings',
  '{
    "global": {
      "page_format": "a4",
      "page_orientation": "portrait",
      "margins": { "top": 20, "bottom": 20, "left": 14, "right": 14 },
      "font_family": "helvetica",
      "font_size": 10,
      "header": {
        "logo_url": null,
        "logo_position": "left",
        "logo_height": 15,
        "background_color": "#3b82f6",
        "text_color": "#ffffff",
        "title": "Relatório",
        "show_subtitle": true,
        "show_date": true,
        "show_on_all_pages": false
      },
      "footer": {
        "background_color": "transparent",
        "text_color": "#808080",
        "content": "Página {{pagina}} de {{total_paginas}} | Gerado em {{data_geracao}}",
        "show_page_numbers": true,
        "alignment": "center"
      },
      "body": {
        "table_header_color": "#3b82f6",
        "table_stripe_color": "#f5f5f5",
        "section_title_color": "#000000",
        "density": "normal"
      }
    },
    "templates": {
      "outdoors": {
        "inherit_global": true,
        "header_title": "RELAÇÃO DE OUTDOORS - MANUTENÇÃO",
        "include_images": true,
        "image_quality": "medium",
        "group_by_city": false,
        "sort_by": "code"
      },
      "service_orders": {
        "inherit_global": true,
        "header_title": "ORDEM DE SERVIÇO"
      },
      "merchandising": {
        "inherit_global": true,
        "header_title": "RELATÓRIO DE MERCHANDISING"
      }
    }
  }',
  'Configurações de personalização de relatórios PDF'
)
ON CONFLICT (key) DO NOTHING;