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
import {
  FinnhubQuoteResponse,
  ValidatedFinnhubQuoteDto,
} from './types/finnhub.types';
import { validate } from 'class-validator';

@Injectable()
export class FinnhubService {
  private readonly logger = new Logger(FinnhubService.name);

  private readonly baseUrl = 'https://finnhub.io/api/v1';

  private readonly token = process.env.FINNHUB_API_TOKEN;

  constructor(private readonly httpService: HttpService) {}

  async getCurrentPriceForStock(symbol: string): Promise<number> {
    await this.throwIfSymbolNotFound(symbol);
    const finnhubResponse = await this.fetchSymbolAndHandleError(symbol);
    const validatedData = await this.validateQuoteResponse(finnhubResponse);

    return validatedData.currentPrice;
  }

  async fetchSymbolAndHandleError(
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

  async throwIfSymbolNotFound(symbol: string): Promise<void> {
    const finnhubResponse = await this.fetchSymbolAndHandleError(symbol);

    const validatedData = await this.validateQuoteResponse(finnhubResponse);

    // Finnhub returns 0 for the current price if the symbol is not found
    // It might not be the most elegant way to check for this, but it works for now
    if (validatedData.c === 0) {
      this.logger.error(`Symbol ${symbol} not found on Finnhub.`);
      throw new NotFoundException(`Stock with symbol '${symbol}' not found`);
    }

    return;
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
}
