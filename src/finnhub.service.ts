import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { FinnhubQuoteResponse } from './types/finnhub.types';
import { ValidatedFinnhubQuoteDto } from './dto/finnhub-quote.dto';
import { validate } from 'class-validator';
import { StockPriceData } from './types/stock.types';

@Injectable()
export class FinnhubService {
  private readonly logger = new Logger(FinnhubService.name);

  private readonly baseUrl = 'https://finnhub.io/api/v1';

  private readonly token = process.env.FINNHUB_API_TOKEN;

  constructor(private readonly httpService: HttpService) {}

  async getCurrentQuoteForStock(symbol: string): Promise<StockPriceData> {
    const finnhubResponse = await this.fetchQuoteAndHandleError(symbol);
    const validatedData = await this.validateQuoteResponse(finnhubResponse);
    this.throwIfSymbolNotFound(symbol, validatedData);

    return {
      price: validatedData.currentPrice,
      publishedAt: validatedData.publishedAt,
      accessedAt: validatedData.accessedAt,
    };
  }

  private async fetchQuoteAndHandleError(
    symbol: string,
  ): Promise<FinnhubQuoteResponse> {
    const { data } = await firstValueFrom<AxiosResponse<FinnhubQuoteResponse>>(
      this.httpService
        .get<FinnhubQuoteResponse>(
          `${this.baseUrl}/quote?symbol=${symbol}&token=${this.token}`,
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);

            throw new InternalServerErrorException(
              'Error while fetching stock data from Finnhub',
            );
          }),
        ),
    );

    return data;
  }

  private async validateQuoteResponse(
    rawResponse: FinnhubQuoteResponse,
  ): Promise<ValidatedFinnhubQuoteDto> {
    const dto = ValidatedFinnhubQuoteDto.fromApiResponse(rawResponse);
    const errors = await validate(dto);

    if (errors.length > 0) {
      this.logger.error(
        `Validation failed for Finnhub response: ${JSON.stringify(errors)}`,
      );
      throw new BadRequestException('Invalid data received from Finnhub API');
    }

    return dto;
  }

  private throwIfSymbolNotFound(
    symbol: string,
    validatedData: ValidatedFinnhubQuoteDto,
  ) {
    // The best indicators I could find for nonexistent symbols are:
    // - c is 0
    // - d is null
    // - dp is null
    if (
      validatedData.c === 0 ||
      validatedData.d === null ||
      validatedData.dp === null
    ) {
      this.logger.error(`Symbol ${symbol} not found on Finnhub.`);
      throw new NotFoundException(
        `Stock with symbol '${symbol}' not found on Finnhub`,
      );
    }
  }
}
